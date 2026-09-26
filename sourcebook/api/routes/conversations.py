"""Conversation CRUD endpoints."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo import DESCENDING
from pymongo.client_session import ClientSession

from sourcebook.api.db import conversations_col, projects_col
from sourcebook.api.routes.deps import require_auth
from sourcebook.rag.mongo import run_transaction

router = APIRouter()

# Visible label bound: enough for a short subject line, not a pasted essay.
CONVERSATION_TITLE_MAX_LENGTH = 200
DEFAULT_CONVERSATION_TITLE = "New conversation"


def _normalize_label(value: str, *, field_name: str, max_length: int) -> str:
    """Strip and collapse whitespace; reject empty or oversized labels."""
    normalized = " ".join(value.split())
    if not normalized:
        raise ValueError(f"{field_name} must not be blank")
    if len(normalized) > max_length:
        raise ValueError(f"{field_name} must be at most {max_length} characters")
    return normalized


class CreateConversationRequest(BaseModel):
    title: str = Field(default=DEFAULT_CONVERSATION_TITLE, max_length=CONVERSATION_TITLE_MAX_LENGTH)
    project_id: str | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str) -> str:
        return _normalize_label(
            value,
            field_name="title",
            max_length=CONVERSATION_TITLE_MAX_LENGTH,
        )


class UpdateConversationRequest(BaseModel):
    title: str | None = Field(default=None, max_length=CONVERSATION_TITLE_MAX_LENGTH)
    # project_id is intentionally absent from defaults — we use model_fields_set
    # to distinguish "explicitly set to null (unassign)" from "not included in request".
    project_id: str | None = None

    @field_validator("title")
    @classmethod
    def normalize_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return _normalize_label(
            value,
            field_name="title",
            max_length=CONVERSATION_TITLE_MAX_LENGTH,
        )


def _serialize(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


def _require_project(
    project_id: str | None,
    *,
    session: ClientSession | None = None,
) -> None:
    """Reject unknown project ids before create/reassign writes.

    A transaction-capable backend performs a small write to the project row.
    That makes validation conflict with a concurrent project deletion instead
    of relying on a point-in-time read. A transactional read alone is not
    sufficient to prevent the assignment-after-delete race.

    FakeMongo receives no session and keeps the existing sequential check
    without claiming transactional referential integrity.
    """
    if project_id is None:
        return

    if session is None:
        if projects_col.find_one({"project_id": project_id}) is None:
            raise HTTPException(status_code=404, detail="Project not found.")
        return

    result = projects_col.update_one(
        {"project_id": project_id},
        {"$inc": {"_assignment_guard": 1}},
        session=session,
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Project not found.")


@router.get("/conversations", dependencies=[Depends(require_auth)])
def list_conversations():
    """List conversations; treat unresolved project ids as ungrouped.

    Read-side only: a stored project_id that no longer matches any project is
    returned as null so the sidebar (and any other client that groups by
    existing projects) still shows the conversation under ungrouped. Stored
    rows are not rewritten here. This remains useful for legacy or externally
    introduced orphaned rows even when transactional writes are enabled.
    """
    docs = conversations_col.find(
        {},
        {"session_id": 1, "title": 1, "project_id": 1, "updated_at": 1, "_id": 0},
    ).sort("updated_at", DESCENDING)
    known_project_ids = {
        project["project_id"] for project in projects_col.find({}, {"project_id": 1, "_id": 0})
    }
    listed: list[dict] = []
    for doc in docs:
        serialized = _serialize(doc)
        project_id = serialized.get("project_id")
        if project_id is not None and project_id not in known_project_ids:
            serialized["project_id"] = None
        listed.append(serialized)
    return listed


@router.post("/conversations", dependencies=[Depends(require_auth)])
def create_conversation(body: CreateConversationRequest):
    now = datetime.now(UTC)
    doc = {
        "session_id": str(uuid.uuid4()),
        "title": body.title,
        "project_id": body.project_id,
        "messages": [],
        "created_at": now,
        "updated_at": now,
    }

    def create(session: ClientSession | None) -> dict:
        _require_project(body.project_id, session=session)

        if session is None:
            conversations_col.insert_one(doc)
        else:
            conversations_col.insert_one(doc, session=session)

        return _serialize(doc)

    if body.project_id is None:
        return create(None)

    return run_transaction(create)


@router.get("/conversations/{session_id}", dependencies=[Depends(require_auth)])
def get_conversation(session_id: str):
    doc = conversations_col.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return _serialize(doc)


@router.patch("/conversations/{session_id}", dependencies=[Depends(require_auth)])
def update_conversation(session_id: str, body: UpdateConversationRequest):
    updates: dict = {"updated_at": datetime.now(UTC)}

    if "title" in body.model_fields_set and body.title is not None:
        updates["title"] = body.title

    project_change = "project_id" in body.model_fields_set
    if project_change:
        updates["project_id"] = body.project_id

    def apply_update(session: ClientSession | None) -> dict:
        if project_change:
            _require_project(body.project_id, session=session)

        if session is None:
            result = conversations_col.update_one(
                {"session_id": session_id},
                {"$set": updates},
            )
        else:
            result = conversations_col.update_one(
                {"session_id": session_id},
                {"$set": updates},
                session=session,
            )

        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Conversation not found.")

        return {"ok": True}

    # Assigning/reassigning crosses the projects and conversations collections.
    # Unassigning to None and title-only edits remain single-document writes.
    if project_change and body.project_id is not None:
        return run_transaction(apply_update)

    return apply_update(None)


@router.delete("/conversations/{session_id}", dependencies=[Depends(require_auth)])
def delete_conversation(session_id: str):
    result = conversations_col.delete_one({"session_id": session_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found.")
    return {"ok": True}

"""Project CRUD endpoints."""

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator
from pymongo.client_session import ClientSession

from sourcebook.api.db import conversations_col, projects_col
from sourcebook.api.routes.deps import require_auth
from sourcebook.rag.mongo import run_transaction

router = APIRouter()

PROJECT_NAME_MAX_LENGTH = 100


def _normalize_project_name(value: str) -> str:
    """Strip and collapse whitespace; reject empty or oversized names."""
    normalized = " ".join(value.split())
    if not normalized:
        raise ValueError("name must not be blank")
    if len(normalized) > PROJECT_NAME_MAX_LENGTH:
        raise ValueError(f"name must be at most {PROJECT_NAME_MAX_LENGTH} characters")
    return normalized


class CreateProjectRequest(BaseModel):
    name: str = Field(max_length=PROJECT_NAME_MAX_LENGTH)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str) -> str:
        return _normalize_project_name(value)


@router.get("/projects", dependencies=[Depends(require_auth)])
def list_projects():
    docs = projects_col.find(
        {},
        {"_id": 0, "_assignment_guard": 0},
    ).sort("created_at", 1)
    return list(docs)


@router.post("/projects", dependencies=[Depends(require_auth)])
def create_project(body: CreateProjectRequest):
    doc = {
        "project_id": str(uuid.uuid4()),
        "name": body.name,
        "created_at": datetime.now(UTC),
    }
    projects_col.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.delete("/projects/{project_id}", dependencies=[Depends(require_auth)])
def delete_project(project_id: str):
    """Delete a project and release its conversations.

    On a transaction-capable backend, project deletion and conversation
    unassignment commit atomically. FakeMongo keeps the existing sequential
    behavior and does not claim transactional referential integrity.
    """

    def delete_and_unassign(session: ClientSession | None) -> dict:
        if session is None:
            if projects_col.find_one({"project_id": project_id}) is None:
                raise HTTPException(status_code=404, detail="Project not found.")

            conversations_col.update_many(
                {"project_id": project_id},
                {"$set": {"project_id": None}},
            )
            result = projects_col.delete_one({"project_id": project_id})
        else:
            result = projects_col.delete_one(
                {"project_id": project_id},
                session=session,
            )
            if result.deleted_count == 0:
                raise HTTPException(status_code=404, detail="Project not found.")

            conversations_col.update_many(
                {"project_id": project_id},
                {"$set": {"project_id": None}},
                session=session,
            )

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Project not found.")

        return {"ok": True}

    return run_transaction(delete_and_unassign)

# Sourcebook v1.0.0

The final release of Sourcebook for CMSC 495, Unit 8. It is a pilot, not a
production system, and the sections below say plainly what it does, what is
broken, and what nobody has measured.

Tagged commit: Pending. The evidence behind every claim here is in
[handoff.md](handoff.md). Graders start at [portfolio.md](portfolio.md).

Stakeholder video: Pending, linked after upload
([#216](https://github.com/CMSC495-GROUP3/Sourcebook/issues/216)).

## What it does

Sourcebook answers employee policy questions from a fixed corpus of company
documents and cites the document behind every answer. When the corpus does not
cover a question, it says so and offers to hand the question to Human
Resources rather than guessing.

A question goes through retrieval against a vector index, then a grounding
gate that compares the best passage score against a threshold. When the score
clears it, a coverage judge checks that the passages actually answer the
question. If either says no, there is no answer generation and the user gets a
refusal card with a button to ask Human Resources. Otherwise the answer
streams back with the policies it drew on and a match score. Human Resources
works the escalations on the HR Requests page.

## What changed since the beta

Pending until the freeze. So far:

- **The refusal card says which check refused**, so a question the coverage
  judge refuses no longer shows "Strong match" under "No matching policy"
  (#269, PR #271).
- **Project assignment and deletion no longer race.** On a replica set,
  which Atlas clusters like the pilot's are, both run in transactions, so a
  conversation can't be left
  assigned to a project that was deleted at the same moment (#142, PR #279).
- **The move-to-project menu stays open** when the pointer leaves the row
  (PR #272).
- **On a phone, Back and keyboard focus behave on the HR Requests page and
  the Policy Library.** Back from the list leaves the page instead of
  reopening the item just left. Focus moves to the item when it opens and
  back to its row on return, and a resolve or reopen is announced to screen
  readers (#266, PR #277).
- **The sign-in page has a main landmark** for screen readers, and a page
  description for search results (PR #280).
- **When related policies don't answer a question as asked,** the refusal
  card now says to ask the full question again with the details it depends
  on, instead of reading as a dead end (PR #281).

## Getting access

**The pilot** runs at <https://sourcebook.duckdns.org> on a single instance.
It needs a password, which the team supplies through the course channel,
never through this repository.

**Without any credential**, the whole app runs locally in about two minutes
with a fake model and an in-memory database:

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
make setup && make stub     # then, in a second terminal
make web
```

**Setup and usage** are in [docs/install.md](../../install.md), the user guide
(Pending, #259), and the [README](../../../README.md).

## Known defects

Pending: confirm at the freeze.

| Issue | What a user would see | Impact | Mitigation |
| --- | --- | --- | --- |
| Vague questions on covered topics | "Can I expense this trip?" is refused where the alpha answered in general terms | the user gets the refusal card instead of a pointer to the travel policy | the card says to ask the full question again with the details it depends on (PR #281), or use Ask Human Resources |

## What this release does not establish

Pending: written at the freeze from what was measured. See
[handoff.md](handoff.md#what-this-release-does-not-establish).

## Reproducing this exact version

The pilot host follows `main`, so it moves past this tag. The tag does not.

```bash
git clone https://github.com/CMSC495-GROUP3/Sourcebook.git
cd Sourcebook
git checkout v1.0.0
make setup && make stub
```

Showing the pilot at the tagged version is the by-hand procedure in the
[alpha handoff](../v0.1.0-alpha.1/handoff.md#the-tag-and-reproducing-this-version-later).

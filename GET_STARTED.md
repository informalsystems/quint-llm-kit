# Getting Started with Quint LLM Kit

[Quint](https://quint-lang.org/) is a language for writing lightweight models of how a system is *supposed* to behave.
You describe the states your system can be in, the transitions between them, and properties that must always hold —
then the tooling automatically explores thousands of scenarios to find logic bugs, deadlocks, and violated assumptions
before you write a line of implementation code.

This kit uses Claude to help you write and iterate on those models.
It works at any stage: starting from scratch, adding a spec to an existing codebase, or generating an implementation from a spec you've already written.
If you have documentation, it reads that. If you have code, it reads that too. Neither is required to get started.

**Prerequisite:** [Docker](https://docs.docker.com/get-docker/) must be installed. All commands run inside the container — nothing needs to be installed on your machine directly.

**Not sure where you are in the process?**
Run `/spec:next` — it reads your project state and tells you what to do next.

---

## How it works

The kit organizes work into four command groups, each covering a distinct phase:

```
┌──────────────┬──────────────┬──────────────┬────────────────────────┐
│  /spec:*     │  /verify:*   │  /code:*     │  /refactor:*           │
│              │              │              │                        │
│  Generate    │  Check your  │  Bring your  │  Update your           │
│  your model  │  model       │  code in     │  model as              │
│  or new spec │              │  line        │  requirements change   │
└──────────────┴──────────────┴──────────────┴────────────────────────┘
       │               │               │               │
    Step 1          Step 2          Step 3          ongoing
```

---

## Step 1 — Generate your model (`/spec:*`)

First, decide which path fits your system:

```
                        What are you modeling?
                               │
              ┌────────────────┴────────────────┐
              │                                 │
    A distributed protocol                 Everything else
    where multiple nodes exchange      (algorithms, data structures,
    messages to reach agreement        smart contracts, single-process
    (consensus, replication,           state machines)
     leader election, etc.)
              │                                 │
              ▼                                 ▼
     Use Choreo — a companion           Use plain Quint
     framework that handles the
     message-passing scaffolding
     so you focus on the logic
              │                                 │
              ▼                                 ▼
    /spec:setup-choreo               skip — go straight to
    /spec:start                      /spec:start
```

### `/spec:setup-choreo`

Downloads the Choreo framework into `specs/choreo/`.
Skip this if you're not modeling a distributed protocol.

```
/spec:setup-choreo
```

### `/spec:start`

Scans your repository for documentation (`.md` files), identifies what can be modeled,
and walks you through generating a Quint model interactively.
It will ask:

- What to focus on (the protocol flow, data types, helper functions, or all of the above)
- How much scaffolding to generate (a skeleton with placeholders, a complete model, or a comprehensive model with properties and scenario tests)

```
/spec:start
```

The output is written to `specs/<name>.qnt`.
Think of this file as your design's source of truth — a precise, machine-checkable description of what your system does.

---

## Step 2 — Check your model (`/verify:*`)

Once you have a model, the `/verify` commands help you check it is correct and complete.

There are two things worth checking:

1. **Safety properties** — things that must *never* happen
   (e.g. two nodes commit conflicting values, a lock is held by two owners at once)
2. **Reachability** — things that *can* happen
   (e.g. the protocol can actually complete, a value can actually be committed)

Both matter.
A model that's too constrained will silently rule out the behaviors you care about.

```
  model created
       │
       ▼
  quint typecheck specs/myspec.qnt
  ─────────────────────────────────── always start here
  Catches type errors and syntax issues before running anything.
       │
       ├── errors? ──► fix, then recheck
       │
       ▼
  /verify:generate-witness
  ─────────────────────────────────── reachability check
  Generates scenario tests that confirm your model can actually
  reach the states you care about. If a scenario can't be reached,
  your model may be over-constrained.
       │
       ▼
  quint run specs/myspec.qnt --invariant=<name>
  ─────────────────────────────────── safety check
  Runs thousands of random scenarios to try to violate a property
  you've defined (e.g. "no two nodes decide different values").
  A violation means the tool found a concrete sequence of steps
  that breaks your rule — a bug in the design, not the code.
       │
       ├── violation found?
       │     │
       │     ▼
       │   /verify:explain-trace     ← walk through what went wrong, step by step
       │   /verify:debug-witness     ← find which constraint is causing a scenario to fail
       │
       ▼
  /verify:check-types              ← confirm all message type variants are reachable
  /verify:check-listeners          ← confirm all protocol handlers fire correctly (Choreo only)
```

### All `/verify:*` commands

| Command | What it does |
|---|---|
| `/verify:generate-witness` | Generates scenario tests that confirm your model can reach key states |
| `/verify:explain-trace` | Walks through a failing scenario step by step in plain language |
| `/verify:debug-witness` | Progressively relaxes constraints to find why a scenario can't be reached |
| `/verify:test-listeners` | Generates concrete test runs from failing scenarios (Choreo only) |
| `/verify:check-types` | Confirms every message or event type defined in the model is actually reachable |
| `/verify:check-listeners` | Confirms every protocol message handler can be triggered |

---

## Step 3 — Implement from your spec (`/code:*`)

Once the model is stable and checked, use it to drive your implementation.
This works whether you're writing code for the first time or updating an existing codebase.

```
  checked model
       │
       ▼
  /code:start
  ─────────────────────── creates an implementation plan from the spec.
                          for a new project: plans how to build it from scratch.
                          for an existing codebase: plans what needs to change.
       │
       ▼
  review the plan
       │
       ▼
  /code:orchestrate-migration
  ─────────────────────── executes the plan with review gates at each step
       │
  (optionally)
       ▼
  /code:label-transitions
  ─────────────────────── annotates the model's transitions so automated tests
                          can verify your implementation matches the model
```

---

## Step 4 — Keep the model up to date (`/refactor:*`)

As your requirements change, the model needs to change with them.
The refactor commands update it systematically rather than by hand.

```
  /refactor:start        ← describe what you want to change, runs the full cycle
                            (plan → apply → verify with approval gates)

  Advanced:
  /refactor:prepare      ← creates an isolated working copy before making changes
  /refactor:plan         ← drafts a refactor plan from new requirements
  /refactor:apply        ← applies a plan to the model files
  /refactor:validate     ← checks the updated model is still consistent
```

---

## Quick reference

```
Not sure what to do?
  /spec:next

Starting fresh:
  /spec:setup-choreo          (distributed protocols only)
  /spec:start

Checking your model:
  /verify:start              (or /verify:generate-witness)
  quint typecheck specs/myspec.qnt
  /verify:check-types
  /verify:check-listeners

Debugging:
  /verify:explain-trace
  /verify:debug-witness

Implementing from your spec:
  /code:start
  /code:orchestrate-migration

Updating the model:
  /refactor:start
```

---

## Typical first session

```
1.  make build && make run DIR=~/my-project
2.  /spec:next                   # see where you are
3.  /spec:setup-choreo           # (skip if not a distributed protocol)
4.  /spec:start                  # generate a model from your docs
5.  quint typecheck specs/...    # fix any type errors
6.  /verify:generate-witness  # confirm the model can reach the states you care about
7.  /spec:next                   # see what's left to do
```

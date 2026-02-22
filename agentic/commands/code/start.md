---
command: /code:start
description: Start implementing from your Quint spec — creates a plan for new projects (greenfield) and existing codebases
version: 1.0.0
---

# Code Start

This is the entry point for implementing from a Quint specification.
It runs the same procedure as `/code:plan-migration`. See that command for full documentation.

Running `/code:start` will:
1. Detect whether you have an existing codebase (migration) or are starting from scratch (greenfield)
2. Ask about your target language and architecture if needed
3. Produce an implementation plan ready for `/code:orchestrate-migration` to execute

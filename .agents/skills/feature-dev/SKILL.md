---
name: feature-dev
description: Guided 7-phase feature development workflow with codebase exploration, clarifying questions, architecture design, implementation, and quality review. Use when the user says /feature-dev, wants guided feature development, or asks to build a new feature with thorough planning.
---

# Feature Development

A systematic 7-phase workflow for building new features: understand the codebase, clarify requirements, design architecture, implement, and review. Use `mcp_task` to launch code-explorer, code-architect, and code-reviewer subagents at the appropriate phases.

## Core Principles

- **Ask clarifying questions**: Identify ambiguities before designing. Wait for answers before proceeding.
- **Understand before acting**: Read existing code patterns first.
- **Read files identified by subagents**: After subagents return, read the key files they list to build context.
- **Use TodoWrite**: Track progress through all phases.

---

## Phase 1: Discovery

**Goal**: Understand what needs to be built.

1. Create todo list with all 7 phases.
2. If the feature request is unclear, ask:
   - What problem are they solving?
   - What should the feature do?
   - Any constraints or requirements?
3. Summarize understanding and confirm with the user.

---

## Phase 2: Codebase Exploration

**Goal**: Understand relevant existing code and patterns.

1. Launch 2–3 `code-explorer` subagents **in parallel** via `mcp_task`. Each targets a different aspect:
   - Similar features and implementation tracing
   - Architecture and abstractions
   - UI patterns, testing, or extension points

2. **Example prompts** (adapt `[feature]` to the request):
   - "Find features similar to [feature] and trace through their implementation comprehensively. Return a list of 5–10 key files to read."
   - "Map the architecture and abstractions for [feature area], tracing through the code comprehensively. Return a list of 5–10 key files to read."
   - "Analyze the current implementation of [related feature/area], tracing through the code comprehensively. Return a list of 5–10 key files to read."

3. After subagents return, **read all files they identify** to build deep understanding.
4. Present a summary of findings and patterns.

---

## Phase 3: Clarifying Questions

**Goal**: Resolve ambiguities before design. **Do not skip.**

1. Review codebase findings and the original feature request.
2. Identify underspecified aspects: edge cases, error handling, integration points, scope, backward compatibility, performance.
3. Present all questions in a clear, organized list.
4. **Wait for answers before Phase 4.**

If the user says "whatever you think is best", give a recommendation and get explicit confirmation.

---

## Phase 4: Architecture Design

**Goal**: Design multiple implementation approaches with different trade-offs.

1. Launch 2–3 `code-architect` subagents **in parallel** with different focuses:
   - **Minimal changes**: Smallest change, maximum reuse
   - **Clean architecture**: Maintainability, clear abstractions
   - **Pragmatic balance**: Speed + quality

2. **Example prompts** (adapt to the feature):
   - "Design the architecture for [feature] with minimal changes to the existing codebase. Maximum reuse of existing patterns."
   - "Design the architecture for [feature] with clean separation and maintainability in mind."
   - "Design a pragmatic architecture for [feature] balancing implementation speed and code quality."

3. Review all approaches and form your recommendation.
4. Present: brief summary of each, trade-offs, **your recommendation with reasoning**.
5. **Ask which approach the user prefers.**

---

## Phase 5: Implementation

**Goal**: Build the feature. **Do not start without user approval.**

1. Wait for explicit user approval.
2. Read all relevant files identified in earlier phases.
3. Implement following the chosen architecture.
4. Follow codebase conventions strictly.
5. Update todos as you progress.

---

## Phase 6: Quality Review

**Goal**: Ensure code is simple, DRY, elegant, and correct.

1. Launch 3 `code-reviewer` subagents **in parallel** with different focuses:
   - Simplicity, DRY, elegance
   - Bugs and functional correctness
   - Project conventions and abstractions

2. **Example prompts**:
   - "Review the recent changes for simplicity, DRY principles, and code elegance. Focus on maintainability."
   - "Review the recent changes for bugs, logic errors, and functional correctness."
   - "Review the recent changes for adherence to project conventions and proper use of abstractions."

3. Consolidate findings and identify highest-severity issues.
4. **Present findings and ask**: fix now, fix later, or proceed as-is.
5. Address issues based on the user's decision.

---

## Phase 7: Summary

**Goal**: Document what was accomplished.

1. Mark all todos complete.
2. Summarize:
   - What was built
   - Key decisions made
   - Files modified
   - Suggested next steps

---

## When to Use

**Use for**: New features touching multiple files, features needing architectural decisions, complex integrations, unclear requirements.

**Skip for**: Single-line fixes, trivial changes, well-defined simple tasks, urgent hotfixes.

---

## Subagent Usage

Use `mcp_task` with these `subagent_type` values:

| Phase | subagent_type   | Count |
|-------|-----------------|-------|
| 2     | code-explorer   | 2–3   |
| 4     | code-architect  | 2–3   |
| 6     | code-reviewer   | 3     |

Launch subagents **in parallel** when multiple are needed. Include in each prompt a request to return key files or findings so you can read them afterward.

---

## Additional Resources

- For detailed subagent prompts and troubleshooting, see [reference.md](reference.md)

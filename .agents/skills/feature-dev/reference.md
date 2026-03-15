# Feature Development — Reference

Detailed subagent behaviors and prompt templates for the feature-dev workflow.

## Code Explorer (Phase 2)

**Purpose**: Trace execution paths, map architecture, document dependencies.

**Focus areas**:
- Entry points (APIs, UI components, CLI)
- Call chains and data flow
- Abstraction layers (presentation → business logic → data)
- Design patterns and interfaces
- Cross-cutting concerns (auth, logging, caching)

**Output to request**: Entry points with file:line, step-by-step flow, key components, architecture insights, list of 5–10 essential files to read.

**Sample prompt template**:
```
Trace how [feature/area] works in this codebase. Find entry points, follow call chains from entry to output, map abstraction layers, and identify design patterns. Document dependencies and integration points. Return a list of 5–10 files that are essential to understand this feature.
```

---

## Code Architect (Phase 4)

**Purpose**: Design feature architecture and implementation blueprints.

**Focus areas**:
- Existing patterns and conventions
- Architecture decisions with rationale
- Component design (file path, responsibilities, interfaces)
- Implementation map (files to create/modify)
- Data flow and build sequence

**Output to request**: Patterns found, chosen approach with rationale, component design, implementation map, phased build sequence.

**Sample prompt template**:
```
Design the architecture for [feature]. Analyze existing codebase patterns first. Provide: (1) patterns and conventions found with file references, (2) your chosen architecture with rationale, (3) component design with file paths and responsibilities, (4) implementation map of files to create/modify, (5) phased build sequence as a checklist.
```

---

## Code Reviewer (Phase 6)

**Purpose**: Review for bugs, quality, and project conventions.

**Focus areas**:
- Project guidelines (CLAUDE.md or equivalent)
- Bugs: logic errors, null handling, race conditions, security
- Code quality: duplication, error handling, test coverage
- Confidence-based filtering: only report issues with confidence ≥ 80

**Output to request**: Critical vs important issues, file:line references, specific fix suggestions.

**Sample prompt template**:
```
Review the unstaged changes (git diff) for [focus: simplicity/DRY | bugs/correctness | conventions/abstractions]. Only report issues with high confidence (≥80). For each issue: description, file:line, project guideline or bug explanation, concrete fix suggestion. Group by severity (Critical vs Important).
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Subagents slow | Normal for large codebases. Run in parallel when possible. |
| Too many clarifying questions | Be more specific in the initial request, or say "whatever you think is best" for non-critical choices. |
| Architecture options overwhelming | Trust the recommendation. Ask for more explanation if needed. Pick pragmatic when unsure. |

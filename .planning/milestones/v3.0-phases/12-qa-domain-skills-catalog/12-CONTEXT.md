# Phase 12: Built-in QA Domain Skills Catalog - Context

**Gathered:** 2026-08-19
**Status:** Ready for planning
**Mode:** Smart Discuss (v3.0 Milestone)

<domain>
## Phase Boundary

Deliver battle-tested prompt engineering, selector heuristics, and domain tools for high-complexity web testing scenarios: Auth/MFA, Forms, Data Tables, and Shadow DOM/Modals. Fulfills requirements DOMAIN-01, DOMAIN-02, DOMAIN-03, and DOMAIN-04.
</domain>

<decisions>
## Implementation Decisions

### 1. Built-in Skills Catalog Implementation
- Author 4 dedicated skills in `src/lib/skills/builtins/`:
  - `authSessionSkill`: Password/MFA selectors, 2FA inputs, cookie banners, session timeout waits.
  - `formValidationSkill`: Custom selects, datepickers, blur/tab triggers, error container checks (`aria-invalid`).
  - `dataTablesSkill`: Scoped table row/column locators, cell actions, sorting/pagination navigation.
  - `shadowDomModalsSkill`: Shadow root penetration, iframe boundaries, modal backdrops, animated transitions.
- Register these 4 skills in `src/lib/skills/builtins/index.ts` with complete prompt modifiers, parameter constraints, and target tool bindings.
</decisions>

<code_context>
## Existing Code Insights

- `src/lib/skills/builtins/index.ts`: Pre-existing built-ins stub created in Phase 09.
- `src/lib/skills/schema.ts`: Type-safe schema definition to validate each built-in skill.
</code_context>

<specifics>
## Specific Requirements Covered

- **DOMAIN-01**: Authentication & Session Edge Cases Skill.
- **DOMAIN-02**: Dynamic Form & Validation Handling Skill.
- **DOMAIN-03**: Data Tables & Pagination Skill.
- **DOMAIN-04**: Shadow DOM & Modal Overlay Skill.
</specifics>

---
phase: 09-skills-runtime-and-registry
plan: 01
subsystem: skills
tags: [skills, zod, schema, serialization, yaml, json]
requires: []
provides:
  - "TypeScript contracts for SkillDefinition, ToolDefinition, SkillDomain, SkillPreset"
  - "Zod runtime schemas & validation helpers for skills and tools"
  - "Bi-directional .skill.json & .skill.yaml serialization/deserialization"
affects:
  - "Agent skill definitions and dynamic runtime registry"
tech-stack:
  added:
    - "zod@^3.25.76"
    - "zod-to-json-schema@^3.25.2"
  patterns:
    - "Zod runtime safe-parsing for untrusted external skill descriptors"
    - "Safe YAML parsing using yaml.JSON_SCHEMA to mitigate injection risks"
key-files:
  created:
    - src/types/skills.ts
    - src/lib/skills/schema.ts
    - src/lib/skills/schema.test.ts
    - src/lib/skills/serializer.ts
    - src/lib/skills/serializer.test.ts
  modified:
    - package.json
    - pnpm-lock.yaml
    - src/types/index.ts
metrics:
  duration: 4m
  completed_date: "2026-08-19"
---

# Phase 09 Plan 01: Skill Types, Zod Schemas & Serializer Summary

Implemented foundational TypeScript types, runtime Zod validation schemas, and bi-directional `.skill.json` / `.skill.yaml` serializer & parser for Tracy declarative agent skills (SKILL-01).

## Key Deliverables

1. **Skill Type Contracts (`src/types/skills.ts`, `src/types/index.ts`)**:
   - Declared interfaces: `SkillDefinition`, `ToolDefinition`, `SkillParameterDef`, `SkillPreset`, `SkillValidationResult`, and `SkillDomain` union type (`'auth' | 'forms' | 'tables' | 'shadow-dom' | 'generic'`).
2. **Runtime Zod Validation (`src/lib/skills/schema.ts`)**:
   - `skillDefinitionSchema`, `toolDefinitionSchema`, and `validateSkillDefinition` helper returning typed validation results and actionable field error messages.
3. **Serialization & Safe Deserialization (`src/lib/skills/serializer.ts`)**:
   - `serializeSkill(skill, format)`: Converts skill definitions to formatted JSON or clean YAML strings.
   - `parseSkill(content, format?)`: Safely parses JSON or YAML using `yaml.JSON_SCHEMA` and validates against `skillDefinitionSchema`, auto-detecting syntax format when omitted.
4. **Unit Test Coverage**:
   - `src/lib/skills/schema.test.ts`: 7 tests verifying valid, minimal, missing fields, invalid domain, and tool parameter schema checks.
   - `src/lib/skills/serializer.test.ts`: 6 tests verifying JSON/YAML serialization, round-trip deserialization, auto-detection, and malformed syntax / schema error responses.

## Deviations from Plan

None - plan executed as specified.

## Threat Flags

None - YAML deserialization uses `yaml.JSON_SCHEMA` safe schema to mitigate arbitrary execution risks (T-09-01), and inputs are strictly validated through Zod (T-09-02).

## Self-Check: PASSED
- `src/types/skills.ts` exists.
- `src/lib/skills/schema.ts` exists.
- `src/lib/skills/serializer.ts` exists.
- Commits `717f6c6` and `8f45420` exist.
- `pnpm lint` and full test suite (`362 tests`) passed.

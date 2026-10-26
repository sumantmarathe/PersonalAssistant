# V-Cycle Multi-Agent Engineering Framework

This repository adheres to the **V-Model Development Lifecycle**, orchestrated through GitHub Issues and specialized agent personas.

```
       [Requirements Analyst]                 [E2E / QA Agent]
                 \                                  /
         [System Architect]              [Integration Tester]
                   \                            /
             [Lead Developer] --------> [Unit Tester]
```

## Stage Workflow & Labels

Every GitHub Issue moves sequentially through these stages:

| Stage Label | Owner Persona | Objective | Exit Criteria / Gate |
| :--- | :--- | :--- | :--- |
| `stage: 1-requirements` | **Requirements Analyst** | Define user stories, Gherkin scenarios (`Given/When/Then`), acceptance criteria. | All questions answered; criteria signed off. |
| `stage: 2-architecture` | **System Architect** | Design module structure, state models, data schemas, and API contracts. | Architectural document committed to `docs/design/`. |
| `stage: 3-implementation`| **Lead Developer** | Write clean, modular, production code. | Code implemented on feature branch, adheres to architecture. |
| `stage: 4-unit-test` | **Unit Test Engineer** | Write unit tests for all components, logic branches, and edge cases. | 100% unit test pass rate. |
| `stage: 5-integration` | **Integration Tester** | Test component interactions, persistence, state transitions. | End-to-end component data flow verified. |
| `stage: 6-qa-e2e` | **QA / E2E Validator** | Validate user workflows in real browser; verify against original ACs. | Automated browser verification completed and recorded. |
| `stage: ready-to-merge`| **Tech Lead / User** | Review PR diff, review test artifacts, final sign-off. | PR merged into `main`. |

## Clarification Protocol

At any point in the cycle:
1. If requirements, edge cases, or UX designs are underspecified, the active agent **MUST NOT GUESS**.
2. The agent must log an issue comment or prompt the user with explicit options.
3. Execution pauses until the user provides clarification.

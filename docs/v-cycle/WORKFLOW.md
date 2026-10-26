# High-Assurance V-Cycle Governance Framework

This repository operates under a **Mission-Critical Multi-Agent Governance Model**, featuring separation of concerns, the **Four-Eyes Principle**, and **Independent Verification and Validation (IV&V)**.

```
                         [Customer (You)]
                                |
                   [Tech Lead / Customer Liaison]
                                |
               +----------------+----------------+
               |                                 |
     [Scrum Master / Reporting]         [V-Cycle Engineering Core]
                                                 |
                                     +-----------+-----------+
                                     |                       |
                             [Left-V: Design]        [Right-V: Verification]
                             - Requirements          - Unit Testing
                             - Architecture          - Integration Testing
                                     \                       /
                                      +-- [Developer Core] -+
                                                 |
                                        [L1 Tech Reviewer]
                                                 |
                                        [L2 Principal Auditor]
                                                 |
                                      [Customer Sign-off Gate]
```

---

## The Roles & Hierarchy

### 1. Customer Relationship & Management
- **The Customer (User)**: Defines vision, priorities, and gives final sign-off.
- **Tech Lead**: The single point of contact for the Customer. Speaks business & technical language, formulates tasks, sets Definition of Ready (DoR) / Definition of Done (DoD), and guards entry/exit gates.
- **Scrum Master**: Tracks sprint progress, removes bottlenecks, maintains task documentation, and generates customer-facing progress reports and release notes.

### 2. V-Cycle Engineering Core
- **Requirements Analyst**: Elaborates User Stories into Gherkin scenarios and explicit Acceptance Criteria (ACs).
- **System Architect**: Designs data schemas, state machines, component topologies, and API contracts.
- **Lead Developer**: Implements clean, maintainable, modular code strictly conforming to architecture specs.
- **Unit Test Engineer**: Tests isolated components, mock dependencies, and boundary cases.
- **Integration Test Engineer**: Verifies inter-module communication, storage persistence, and data flow.
- **QA / E2E System Validator**: Drives real browser sessions to validate user-facing ACs and captures session video evidence.

### 3. Independent Oversight & Verification (IV&V)
- **L1 Technical Reviewer**: Independent code, test, and specification auditor. Cross-references code and test cases against the Requirements Traceability Matrix (RTM).
- **L2 Principal Auditor (Reviewer of Reviewer)**: Audits the L1 review for thoroughness, checks security and architecture compliance, and issues the formal Release Gate Clearance.

---

## Governance Gates & Lifecycle

Every task progresses through these mandatory gates:

| Gate | Name | Mandatory Deliverables | Approver |
| :--- | :--- | :--- | :--- |
| **Gate 0** | **Requirements & DoR** | User Story, Gherkin Scenarios, ACs, DoR verified | Tech Lead & Customer |
| **Gate 1** | **Architecture Design** | Mermaid Diagrams, Schema Specifications (`docs/design/`) | Tech Lead |
| **Gate 2** | **Implementation** | Feature branch, clean code adhering to design | Lead Developer |
| **Gate 3** | **Verification Suite** | Unit tests + Integration tests + E2E browser recording | QA & Test Engineers |
| **Gate 4** | **L1 Technical Audit** | Discrepancy report, RTM 100% check (`docs/audits/L1.md`) | L1 Reviewer |
| **Gate 5** | **L2 Meta-Audit** | Review methodology certification (`docs/audits/L2.md`) | L2 Auditor |
| **Gate 6** | **Customer Delivery** | Release Notes, Changelog, Live Demo Verification | Tech Lead & Customer |

---

## Requirements Traceability Matrix (RTM) Standard

Every feature must maintain an entry in `docs/v-cycle/RTM.md`:

```markdown
| Req ID | Description | Design Spec | Code File / Commit | Unit Test | Integration/E2E Test | L1 Sign-off | L2 Sign-off |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| REQ-001 | Persist tasks in LocalStorage | SPEC-001 | storage.js#L20 | storage.test.js | e2e-storage.spec.js | Approved | Certified |
```

# Software Requirements Specification (SRS) - Smart Gate System
**Standard: IEEE 830-1998 (Agile-Integrated) Format**  
**Version:** 1.0  
**Course:** Software Engineering Semester Project  
**Date:** March 9, 2026  
**Project Team:** Pratibha (Development), Riya (QA & Documentation)

---

## 1. Introduction
### 1.1 Purpose
The purpose of this document is to specify the requirements for the Smart Gate System as part of the Software Engineering semester project. This serves as the technical baseline for implementation by Pratibha and quality validation by Riya.

### 1.2 User Stories & Product Backlog (Agile Alignment)
Instead of static requirements, the system is defined by prioritized User Stories:
*   **US.1 (Visitor)**: As a visitor, I want to register via a link so I can gain quick entry.
*   **US.2 (Host)**: As a resident, I want to approve visitors via OTP/Email so I know who is coming.
*   **US.3 (Security)**: As a guard, I want to see a verified list so I can manage the gate efficiently.

### 1.3 Scope (Evolutionary)
*   **Sprint 0-2 (V1 - Core)**: Local registration, local OTP logic, basic logs.
*   **Sprint 3-4 (V2 - Enhanced)**: Firebase Auth, Twilio SMS integration, QR Codes.

### 1.4 Terminology
| Term | Definition |
| :--- | :--- |
| **SGS** | Smart Gate System |
| **Sprint** | 2-week development cycle |
| **MVP** | Minimum Viable Product (Version 1) |
| **PO** | Product Owner (Riya) |
| **SGS** | Smart Gate System |
| **OTP** | One-Time Password |
| **JWT** | JSON Web Token (for secure API communication) |
| **Host** | The resident or employee being visited |

### 1.4 References
*   IEEE Std 830-1998, IEEE Recommended Practice for Software Requirements Specifications.
*   Smart Gate Project Gantt Chart Version 2.0.

---

## 2. Product Description (Agile Context)
### 2.1 Methodology: Agile Scrum
The system development is split into 2-week iterations (Sprints). This allows Riya to review the current features every 14 days and make adjustments to the technical implementation by Pratibha.

### 2.2 Product Backlog (Prioritization)
*   **High Priority**: Visitor registration, OTP verification, Security Guard log.
*   **Medium Priority**: Host notification systems, Blacklist logic.
*   **Future (Low)**: Cloud-based Firebase auth and Twilio automation.

### 2.3 User Classes and Personas
*   **Visitor (User)**: Needs a fast, 1-minute registration process.
*   **Guard (Power User)**: Needs a dashboard with zero-latency visitor verification.
*   **Riya (Product Owner)**: Oversees logic and validates that features meet the project goal.
*   **Pratibha (Development Lead)**: Responsible for the full-stack implementation and code quality.

---

## 3. Specific Requirements (Agile Refinement)
### 3.1 Functional Requirements (Sprint-Ready)
*   **FR.01 (Sprint 1)**: The system shall generate and store unique 6-digit OTPs in the database.
*   **FR.02 (Sprint 2)**: The system shall block entries from numbers in the `Blacklist` collection.
*   **FR.03 (Sprint 4)**: The system shall generate a unique QR code for verified visitors.

### 3.2 Non-Functional Requirements (Scalability)
*   **Security (JWT)**: JSON Web Tokens ensure that only Pratibha and authorized guards can access the visitor records.
*   **Performance**: The registration link must load in under 2 seconds on mobile devices.

---

## 4. Change Management Process
All significant changes to these requirements must be proposed by Pratibha and approved by Riya (Decision Support).

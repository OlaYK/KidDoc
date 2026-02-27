# KidDoc Feature Backlog

This file tracks product feature ideas so they can be implemented in future iterations.

## How To Use This Backlog

- Move a feature from `Planned` to `In Progress` when work starts.
- Add implementation notes and links to PRs/issues under each feature.
- Mark acceptance criteria complete before moving to `Done`.

## Status Legend

- `Planned`: Not started
- `In Progress`: Actively being built
- `Done`: Implemented and released

## Priority Roadmap

### P0 (High Priority)

#### 1) Red-Flag Triage Mode
- Status: `Done`
- Goal: Detect symptoms that may indicate urgent care needs and show stronger safety guidance.
- Why: Safety-critical for a pediatric health assistant.
- Acceptance Criteria:
  - Detect common emergency phrases (breathing trouble, seizure, chest pain, etc.).
  - Show clear emergency guidance in UI.
  - Include triage signal in API response.
  - Log triage outcomes for monitoring (without storing sensitive user text long-term).

#### 2) Multilingual Responses
- Status: `Done`
- Goal: Allow families to receive responses in their preferred language.
- Why: Improves accessibility and adoption for non-English households.
- Acceptance Criteria:
  - Add language selector in UI (start with English, Spanish, French).
  - Validate language on server.
  - Ensure AI responses are generated in selected language.
  - Add tests for language selection and payload validation.

#### 3) Reading-Level Control
- Status: `Done`
- Goal: Let users choose explanation complexity (very simple/simple/detailed).
- Why: Improves comprehension across ages and literacy levels.
- Acceptance Criteria:
  - Add reading-level selector in UI.
  - Include reading-level in prompt strategy.
  - Keep child-safe tone at all levels.
  - Add tests for reading-level handling.

#### 4) Printable Doctor Handoff Summary
- Status: `Done`
- Goal: Generate a print-friendly summary for real doctor visits.
- Why: Helps families communicate symptoms and timeline clearly.
- Acceptance Criteria:
  - Add "Print Summary" action on result view.
  - Include child details, symptoms, triage notes, and AI summary.
  - Print layout works on desktop/mobile browsers.
  - Add disclaimer that this is not a medical diagnosis.

### P1 (Medium Priority)

#### 5) Parent History Timeline
- Status: `Planned`
- Goal: Keep symptom-check history with dates for follow-up.
- Acceptance Criteria:
  - Save prior checks securely.
  - Show chronological timeline.
  - Add delete/export controls.

#### 6) Follow-Up Plan Reminders
- Status: `Planned`
- Goal: Provide optional reminders (hydration, rest, check-ins).
- Acceptance Criteria:
  - User can create reminders from AI advice.
  - Reminder schedule visible in app.
  - Optional notifications.

#### 7) Structured Lab Report Parsing
- Status: `Planned`
- Goal: Parse uploaded lab values into structured sections.
- Acceptance Criteria:
  - Extract key value/units/range fields.
  - Highlight out-of-range values in child-safe language.
  - Include confidence and fallback behavior when extraction fails.

#### 8) Pediatric Care Handoff PDF Export
- Status: `Planned`
- Goal: Download a formal PDF report instead of browser print only.
- Acceptance Criteria:
  - One-click PDF export.
  - Include app version, timestamp, and disclaimer.
  - Works consistently across browsers.

### P2 (Nice To Have)

#### 9) Voice Input + Read-Aloud
- Status: `Planned`
- Goal: Support speech-to-text and text-to-speech for accessibility.
- Acceptance Criteria:
  - Voice symptom entry supported.
  - AI response can be read aloud.
  - Clear controls to stop/pause audio.

#### 10) Caregiver Collaboration Mode
- Status: `Planned`
- Goal: Let parent and child contribute notes in one session.
- Acceptance Criteria:
  - Parent notes and child notes separate in final summary.
  - Combined report printable/shareable.

#### 11) Smart Follow-Up Questions
- Status: `Planned`
- Goal: Ask adaptive follow-up questions before generating final output.
- Acceptance Criteria:
  - AI asks 2-5 clarifying questions when symptoms are vague.
  - Final advice quality improves over single-shot input.

#### 12) School/Activity Guidance
- Status: `Planned`
- Goal: Add practical guidance for school attendance and activity level.
- Acceptance Criteria:
  - Include "school/rest/activity" advice section.
  - Keep conservative safety wording.

## Technical Enablers

These are platform improvements that make feature delivery safer/faster.

- Add observability stack (error tracking + API metrics + request tracing).
- Add security scans and dependency update automation in CI.
- Add end-to-end tests for critical user flows.
- Add feature flags to release high-risk features gradually.

## Suggested Delivery Order

1. Red-Flag Triage Mode
2. Multilingual Responses
3. Reading-Level Control
4. Printable Doctor Handoff Summary
5. Parent History Timeline
6. Structured Lab Report Parsing

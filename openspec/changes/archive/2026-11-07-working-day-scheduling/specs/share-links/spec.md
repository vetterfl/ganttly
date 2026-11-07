# Spec Delta

## MODIFIED Requirements

### Requirement: URL holds the project
The page URL SHALL be updated on every edit so it contains the project title, zoom factor, calendar (calendar days or working days), and every task's name, start, finish, colour, progress, stable ID and predecessor links. Copy link SHALL copy that URL.

#### Scenario: Round trip
- **WHEN** a user builds a chart with links, zooms to 250% and opens the copied link in a new browser
- **THEN** the chart shows the same title, zoom factor, tasks, dates, colours, progress and Predecessors

#### Scenario: Round trip in working days
- **WHEN** a user switches a chart with links to working days and opens the copied link in a new browser
- **THEN** the chart uses working days and shows the same dates, durations and Predecessors

### Requirement: Versioned format with stable task IDs
Links SHALL be written in format version 5. Each task carries a stable numeric ID that is unique within the project, and each link stores the predecessor's stable ID, the link type and the lag in days of the project's calendar. The zoom SHALL be stored as a factor relative to Fit. The calendar SHALL be stored; a missing or unknown value means calendar days.

#### Scenario: IDs survive deletion
- **WHEN** a chart has links, a middle task is deleted, and the link is copied and reopened
- **THEN** all remaining links point to the same tasks as before the reload

#### Scenario: Invalid zoom factor
- **WHEN** a link's zoom factor is missing, not a number, or below 100%
- **THEN** the chart opens at Fit

#### Scenario: Weekend dates in a working-day link
- **WHEN** a hand-edited working-day link has a task starting on a Saturday
- **THEN** the chart loads and the task starts on the following Monday

### Requirement: Backward compatibility
Links in format v4, v3, v2 (base64 JSON without links) and v1 (pipe-separated legacy) SHALL keep opening as calendar-day projects. v2 and v1 tasks load as manually scheduled tasks without links; v3 and v4 tasks keep their links. v4 links keep their zoom factor. The zoom preset stored in v1–v3 SHALL be ignored and those charts SHALL open at Fit. Once the user edits the chart, the URL SHALL be rewritten in v5.

#### Scenario: v1 link
- **WHEN** a user opens `?t=Demo&z=1&d=A|2026-11-02|2026-11-06|3|50`
- **THEN** a chart titled "Demo" at Fit zoom shows task "A" from 2026-11-02 to 2026-11-06, colour 3, 50% complete, without predecessors

#### Scenario: v2 link
- **WHEN** a user opens a v2 link
- **THEN** all its tasks appear with their dates, colours and progress, no predecessors, at Fit zoom

#### Scenario: v3 link
- **WHEN** a user opens a v3 link with predecessor links and zoom preset "Huge"
- **THEN** all tasks and links load unchanged and the chart opens at Fit

#### Scenario: v4 link
- **WHEN** a user opens a v4 link with zoom 250% and links
- **THEN** all tasks and links load unchanged, in calendar days, at 250%

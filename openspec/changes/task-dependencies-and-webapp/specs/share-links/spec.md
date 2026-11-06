# Spec Delta

## Purpose

Keeps the whole project (title, zoom, tasks and their links) in a single shareable URL, so a chart can be shared, bookmarked and reopened without any backend, including links created by earlier versions.

## ADDED Requirements

### Requirement: URL holds the project
The page URL SHALL be updated on every edit so it contains the project title, zoom level, and every task's name, start, finish, colour, progress, stable ID and predecessor links. Copy link SHALL copy that URL.

#### Scenario: Round trip
- **WHEN** a user builds a chart with links and opens the copied link in a new browser
- **THEN** the chart shows the same title, zoom, tasks, dates, colours, progress and Predecessors

### Requirement: Format v3 with stable task IDs
Links SHALL be written in format version 3. Each task carries a stable numeric ID that is unique within the project, and each link stores the predecessor's stable ID, the link type and the lag in days.

#### Scenario: IDs survive deletion
- **WHEN** a chart has links, a middle task is deleted, and the link is copied and reopened
- **THEN** all remaining links point to the same tasks as before the reload

### Requirement: Backward compatibility
Links in format v2 (base64 JSON without links) and v1 (pipe-separated legacy) SHALL keep opening, with their tasks loaded as manually scheduled tasks without links. Once the user edits the chart, the URL SHALL be rewritten in v3.

#### Scenario: v1 link
- **WHEN** a user opens `?t=Demo&z=1&d=A|2026-11-02|2026-11-06|3|50`
- **THEN** a chart titled "Demo" at zoom level Cozy shows task "A" from 2026-11-02 to 2026-11-06, colour 3, 50% complete, without predecessors

#### Scenario: v2 link
- **WHEN** a user opens a v2 link created before this change
- **THEN** all its tasks appear with their dates, colours and progress, and no predecessors

### Requirement: Untrusted input handling
Data read from a URL SHALL be validated: malformed fields fall back to safe defaults, links to unknown IDs and self-links are dropped, and if the links form a cycle, the links causing it are dropped, so the chart still loads.

#### Scenario: Tampered cyclic link
- **WHEN** a hand-edited v3 link makes task A depend on B and B depend on A
- **THEN** the chart loads, at most one of the two links is kept, and no error blocks the page

#### Scenario: Garbage payload
- **WHEN** the `d` parameter is not valid in any format
- **THEN** the page loads the sample project instead of failing

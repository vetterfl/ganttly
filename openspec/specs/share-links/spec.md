# share-links Specification

## Purpose

Keeps the whole project (title, zoom, tasks and their links) in a single shareable URL, so a chart can be shared, bookmarked and reopened without any backend, including links created by earlier versions.

## Requirements

### Requirement: URL holds the project
The page URL SHALL be updated on every edit so it contains the project title, zoom factor, and every task's name, start, finish, colour, progress, stable ID and predecessor links. Copy link SHALL copy that URL.

#### Scenario: Round trip
- **WHEN** a user builds a chart with links, zooms to 250% and opens the copied link in a new browser
- **THEN** the chart shows the same title, zoom factor, tasks, dates, colours, progress and Predecessors

### Requirement: Versioned format with stable task IDs
Links SHALL be written in format version 4. Each task carries a stable numeric ID that is unique within the project, and each link stores the predecessor's stable ID, the link type and the lag in days. The zoom SHALL be stored as a factor relative to Fit.

#### Scenario: IDs survive deletion
- **WHEN** a chart has links, a middle task is deleted, and the link is copied and reopened
- **THEN** all remaining links point to the same tasks as before the reload

#### Scenario: Invalid zoom factor
- **WHEN** a link's zoom factor is missing, not a number, or below 100%
- **THEN** the chart opens at Fit

### Requirement: Backward compatibility
Links in format v3, v2 (base64 JSON without links) and v1 (pipe-separated legacy) SHALL keep opening. v2 and v1 tasks load as manually scheduled tasks without links; v3 tasks keep their links. The zoom preset stored in these older formats SHALL be ignored and the chart SHALL open at Fit. Once the user edits the chart, the URL SHALL be rewritten in v4.

#### Scenario: v1 link
- **WHEN** a user opens `?t=Demo&z=1&d=A|2026-11-02|2026-11-06|3|50`
- **THEN** a chart titled "Demo" at Fit zoom shows task "A" from 2026-11-02 to 2026-11-06, colour 3, 50% complete, without predecessors

#### Scenario: v2 link
- **WHEN** a user opens a v2 link
- **THEN** all its tasks appear with their dates, colours and progress, no predecessors, at Fit zoom

#### Scenario: v3 link
- **WHEN** a user opens a v3 link with predecessor links and zoom preset "Huge"
- **THEN** all tasks and links load unchanged and the chart opens at Fit

### Requirement: Untrusted input handling
Data read from a URL SHALL be validated: malformed fields fall back to safe defaults, links to unknown IDs and self-links are dropped, and if the links form a cycle, the links causing it are dropped, so the chart still loads.

#### Scenario: Tampered cyclic link
- **WHEN** a hand-edited v3 link makes task A depend on B and B depend on A
- **THEN** the chart loads, at most one of the two links is kept, and no error blocks the page

#### Scenario: Garbage payload
- **WHEN** the `d` parameter is not valid in any format
- **THEN** the page loads the sample project instead of failing

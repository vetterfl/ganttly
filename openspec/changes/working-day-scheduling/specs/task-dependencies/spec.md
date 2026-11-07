# Spec Delta

## MODIFIED Requirements

### Requirement: Predecessor notation parsing
The Predecessors cell SHALL accept a list of entries separated by `;` or `,`. Each entry has the form `<ID>[<type>][±<n><unit>]`. Type codes are EA/AA/EE/AE (German) or FS/SS/FF/SF (English), case-insensitive, defaulting to finish-to-start. Units are days (d, day, days, t, tag, tage) or weeks (w, wk, week, weeks, wo, woche, wochen), with optional spaces, defaulting to days. Days are days of the project's calendar. A week SHALL equal 7 days in a calendar-day project and 5 days in a working-day project.

#### Scenario: German shortcut
- **WHEN** the user enters `3EE-2 Tage`
- **THEN** a finish-to-finish link on task 3 with lag −2 days is created

#### Scenario: English shortcut
- **WHEN** the user enters `3FF-2d`
- **THEN** the same finish-to-finish link on task 3 with lag −2 days is created

#### Scenario: Weeks and mixed separators
- **WHEN** the user enters `2aa+1W, 4`
- **THEN** a start-to-start link on task 2 with lag +7 days and a finish-to-start link on task 4 with lag 0 are created

#### Scenario: Bare unit-less lag
- **WHEN** the user enters `3FS+2`
- **THEN** a finish-to-start link on task 3 with lag +2 days is created

#### Scenario: Clearing links
- **WHEN** the user empties the Predecessors cell and leaves it
- **THEN** all of that task's predecessor links are removed

#### Scenario: Weeks in a working-day project
- **WHEN** in a working-day project the user enters `2aa+1W`
- **THEN** a start-to-start link on task 2 with lag +5 days is created

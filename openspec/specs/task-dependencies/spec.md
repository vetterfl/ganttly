# task-dependencies Specification

## Purpose

Lets users declare that one task depends on another, using the four MS Project link types with optional lag, entered and displayed in MS Project's German or English shortcut notation.

## Requirements

### Requirement: Link types and lag
A task SHALL be able to have any number of predecessor links. Each link SHALL name one other task, one of the types finish-to-start, start-to-start, finish-to-finish or start-to-finish, and a whole-day lag that may be positive, negative (lead) or zero.

#### Scenario: Multiple predecessors
- **WHEN** task 5 is given the predecessors `3` and `4SS+1d`
- **THEN** task 5 stores two links: finish-to-start on task 3 with lag 0, and start-to-start on task 4 with lag +1 day

### Requirement: Predecessor notation parsing
The Predecessors cell SHALL accept a list of entries separated by `;` or `,`. Each entry has the form `<ID>[<type>][±<n><unit>]`. Type codes are EA/AA/EE/AE (German) or FS/SS/FF/SF (English), case-insensitive, defaulting to finish-to-start. Units are days (d, day, days, t, tag, tage) or weeks (w, wk, week, weeks, wo, woche, wochen), with optional spaces, defaulting to days. A day is a day of the project's calendar; a week SHALL be 7 days, or 5 in a working-day project.

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

### Requirement: Notation display
The Predecessors cell SHALL show a task's links in the notation language chosen in view settings. The type code SHALL be omitted for finish-to-start links with zero lag, and the lag SHALL be omitted when it is zero. German uses `;` as separator and `T` as the day unit. English uses `,` and `d`. Lags are always shown in days.

#### Scenario: German display
- **WHEN** a task has links finish-to-start on 3 (lag 0) and finish-to-finish on 4 (lag −2) and the language is German
- **THEN** the cell shows `3;4EE-2T`

#### Scenario: English display
- **WHEN** the same task is shown with the language set to English
- **THEN** the cell shows `3,4FF-2d`

### Requirement: Link validation
The system SHALL reject a Predecessors entry that has invalid syntax, references a non-existent task ID, references the task itself, or would create a dependency cycle. A rejected entry SHALL leave the task's existing links unchanged and show an inline error naming the problem.

#### Scenario: Cycle rejected
- **WHEN** task 4 depends on task 3 and the user enters `4` as a predecessor of task 3
- **THEN** the entry is rejected with an error mentioning a circular dependency, and task 3's links stay as before

#### Scenario: Unknown ID
- **WHEN** the chart has 6 tasks and the user enters `9EA`
- **THEN** the entry is rejected with an error that task 9 does not exist

#### Scenario: Self link
- **WHEN** the user enters `2` as a predecessor of task 2
- **THEN** the entry is rejected

#### Scenario: Bad syntax
- **WHEN** the user enters `3XY+2d`
- **THEN** the entry is rejected with a syntax error, and the cell keeps the typed text highlighted until corrected or reverted with Escape

### Requirement: Links follow tasks, not row numbers
Links SHALL refer to tasks by stable identity. When rows are renumbered (for example after a deletion), predecessor cells SHALL show the new row IDs of the same tasks.

#### Scenario: Renumber after delete
- **WHEN** task 5 has predecessor `4` and task 2 is deleted
- **THEN** the former task 5 is now row 4 and its Predecessors cell shows `3`, still pointing to the same task

### Requirement: Deleting a linked task
Deleting a task SHALL remove all links that point to it. Successors that are left without predecessors SHALL become manually scheduled and keep their current dates.

#### Scenario: Delete predecessor
- **WHEN** task 3 is the only predecessor of task 4 (2026-11-10 to 2026-11-12) and task 3 is deleted
- **THEN** the former task 4 has no predecessors and keeps the dates 2026-11-10 to 2026-11-12

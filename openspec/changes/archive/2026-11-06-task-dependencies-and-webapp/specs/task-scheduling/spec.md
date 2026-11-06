# Spec Delta

## Purpose

Defines how task dates are derived: tasks without predecessors are scheduled by hand, and tasks with predecessors are placed as early as their links allow, in calendar days, keeping their duration.

## ADDED Requirements

### Requirement: Manual and auto-scheduled tasks
A task without predecessor links SHALL be manually scheduled: its Start and Finish are whatever the user sets. A task with at least one predecessor link SHALL be auto-scheduled: its Start is computed from its links and its Finish is Start + Duration − 1 day.

#### Scenario: Adding a link makes a task auto-scheduled
- **WHEN** a manual task (5 days, 2026-11-20 to 2026-11-24) gets the predecessor `2`, and task 2 finishes on 2026-11-09
- **THEN** the task moves to 2026-11-10 to 2026-11-14 and keeps its 5-day duration

#### Scenario: Removing the last link
- **WHEN** an auto-scheduled task's last predecessor link is removed
- **THEN** it becomes manually scheduled at its current dates

### Requirement: Link date formulas
All dates are calendar days, weekends included, and Finish is inclusive. For a predecessor P, a successor S of duration D and lag L, each link SHALL give a candidate Start for S:
- finish-to-start: P.finish + 1 + L
- start-to-start: P.start + L
- finish-to-finish: P.finish + L − (D − 1)
- start-to-finish: P.start − 1 + L − (D − 1)

#### Scenario: Finish-to-start with lag
- **WHEN** P finishes 2026-11-10 and S (3 days) has link `P FS+2d`
- **THEN** S runs 2026-11-13 to 2026-11-15

#### Scenario: Finish-to-finish with lead
- **WHEN** P finishes 2026-11-20 and S (4 days) has link `P EE-2T`
- **THEN** S finishes 2026-11-18 and starts 2026-11-15

#### Scenario: Start-to-start
- **WHEN** P starts 2026-11-05 and S has link `P SS+1d`
- **THEN** S starts 2026-11-06

#### Scenario: Start-to-finish
- **WHEN** P starts 2026-11-10 and S (2 days) has link `P SF`
- **THEN** S finishes 2026-11-09 and starts 2026-11-08

### Requirement: Earliest start across links
With several predecessor links, an auto-scheduled task SHALL start on the latest of the candidate starts its links produce (as soon as possible while satisfying all links).

#### Scenario: Two predecessors
- **WHEN** S has links whose candidate starts are 2026-11-12 and 2026-11-15
- **THEN** S starts 2026-11-15

### Requirement: Propagation to successors
Any change to a task's dates or duration, or to links, SHALL immediately reschedule all directly and indirectly dependent tasks. Unrelated tasks SHALL be left unchanged.

#### Scenario: Chain push
- **WHEN** tasks 1 → 2 → 3 are linked finish-to-start and task 1's Finish is moved 3 days later
- **THEN** tasks 2 and 3 both move 3 days later and keep their durations

#### Scenario: Pull earlier
- **WHEN** task 1's Finish is moved 2 days earlier in the same chain
- **THEN** tasks 2 and 3 move 2 days earlier

### Requirement: Editable fields of auto-scheduled tasks
For an auto-scheduled task, the grid SHALL show Start as read-only, marked as computed. Editing Duration or Finish SHALL change the task's duration (Finish changes are turned into Duration = Finish − Start + 1, minimum 1). Progress, name and colour stay editable.

#### Scenario: Start is read-only
- **WHEN** the user tries to edit Start of a task that has predecessors
- **THEN** the cell is not editable and a tooltip explains the date comes from its predecessors

#### Scenario: Finish edit changes duration
- **WHEN** an auto-scheduled task starts 2026-11-10 and the user sets Finish to 2026-11-14
- **THEN** its duration becomes 5 days and its successors are rescheduled

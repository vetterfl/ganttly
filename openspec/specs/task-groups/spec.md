# task-groups Specification

## Purpose

Organises tasks into named, collapsible sections (for example one per company), with MS Project–style summary rows and bars that roll up their tasks' dates and progress.

## Requirements

### Requirement: Group membership and order
A project SHALL have zero or more groups in a user-defined order. Each task SHALL belong to at most one group. The grid and timeline SHALL list ungrouped tasks first, without a header, and then each group's header followed by its tasks. Groups SHALL NOT contain groups.

#### Scenario: Display order
- **WHEN** a project has ungrouped task U, group "Acme" with tasks A1 and A2, and group "Globex" with task G1
- **THEN** the rows are: U, the "Acme" header, A1, A2, the "Globex" header, G1

### Requirement: Task numbering with groups
Tasks SHALL be numbered 1..n in display order across all groups, including tasks hidden by a collapsed group. Group header rows SHALL NOT be numbered. Predecessor entries SHALL refer to these task numbers.

#### Scenario: Numbers skip headers
- **WHEN** the rows are U, the "Acme" header, A1 and A2
- **THEN** U is task 1, A1 is task 2 and A2 is task 3, and the header shows no number

### Requirement: Group header roll-ups
A group header SHALL show an editable name (up to 120 characters) and, from its tasks: Start = earliest start, Finish = latest finish, Duration = Finish − Start + 1 days counted in the project's calendar (calendar days or working days), and % Complete = duration-weighted average progress, rounded. A group without tasks SHALL show empty values. Roll-ups SHALL NOT be editable.

#### Scenario: Span duration
- **WHEN** group "Acme" has task A (2026-11-02 to 2026-11-06, 50%) and task B (2026-11-10 to 2026-11-12, 100%)
- **THEN** the header shows Start 2026-11-02, Finish 2026-11-12, Duration 11 days and % Complete 69%

#### Scenario: Span duration in working days
- **WHEN** the same group is in a working-day project
- **THEN** the header shows Duration 9 days and % Complete 69%

#### Scenario: Roll-ups follow scheduling
- **WHEN** a predecessor change pushes task B in "Acme" three days later
- **THEN** the header's Finish and Duration update immediately

### Requirement: Group summary bar
The timeline SHALL draw one summary bar per group in the header row's lane, from the group's start to its finish, styled as a dark bracket bar with end caps. The group's name SHALL be shown beside it. Header lanes SHALL stay aligned with their grid rows.

#### Scenario: Summary bar span
- **WHEN** group "Acme" spans 2026-11-02 to 2026-11-12
- **THEN** its summary bar starts at the 2026-11-02 column and ends at the end of the 2026-11-12 column, in the lane of the "Acme" header row

#### Scenario: Empty group
- **WHEN** a group has no tasks
- **THEN** its header lane shows no summary bar

### Requirement: Collapse and expand groups
Each group header SHALL have a toggle that collapses or expands the group. A collapsed group SHALL hide its tasks (and their detail strips) in the grid and timeline, while its header, roll-ups and summary bar remain. The collapsed state SHALL be stored in the share link.

#### Scenario: Collapse
- **WHEN** the user collapses "Acme" with 2 tasks
- **THEN** the "Acme" header and summary bar stay visible, its 2 task rows and lanes disappear, and the following rows move up and stay aligned

#### Scenario: Collapsed state is shared
- **WHEN** the user collapses "Acme" and copies the share link
- **THEN** opening the link shows "Acme" collapsed

### Requirement: Adding groups and tasks to groups
An Add group command SHALL append a new empty group named "New group" and focus its name. Each group header SHALL have an add button that appends a new task to that group, using the usual add-task date rule. The ribbon's Add task SHALL append to the last group if groups exist, or to the ungrouped tasks otherwise.

#### Scenario: Add a group
- **WHEN** the user clicks Add group
- **THEN** a "New group" header appears at the end and its name is focused with the text selected

#### Scenario: Add a task into a group
- **WHEN** the user clicks the add button on the "Acme" header
- **THEN** a new task appears as the last row of "Acme" with its name focused

### Requirement: Moving tasks between groups
A task's detail strip SHALL offer a Group selector listing "(No group)" and every group, and choosing one SHALL move the task to the end of that group. Moving a task up past the first position of its group, or down past the last, SHALL move it into the neighbouring group or the ungrouped section. Dropping a dragged task directly below a group header or among its tasks SHALL place it in that group.

#### Scenario: Group selector
- **WHEN** task U is ungrouped and the user picks "Globex" in its Group selector
- **THEN** U becomes the last task of "Globex" and the rows are renumbered

#### Scenario: Move up across a header
- **WHEN** A1 is the first task of "Acme", U is the last ungrouped task, and the user presses Alt+↑ on A1
- **THEN** A1 becomes the last ungrouped task, directly above the "Acme" header

#### Scenario: Drag into a group
- **WHEN** the user drags U and drops it directly below the "Globex" header
- **THEN** U becomes the first task of "Globex"

### Requirement: Moving and deleting groups
Group headers SHALL offer Move up, Move down and Delete, and Alt+↑/↓ while focus is in the header row. A group SHALL move together with its tasks. Deleting a group that has tasks SHALL ask whether to delete its tasks too or keep them as ungrouped tasks. Deleting an empty group SHALL not ask.

#### Scenario: Move a group
- **WHEN** the user moves "Globex" up above "Acme"
- **THEN** the "Globex" header and all its tasks are shown before "Acme", and the tasks are renumbered

#### Scenario: Delete a group and keep its tasks
- **WHEN** the user deletes "Acme" (2 tasks) and chooses to keep the tasks
- **THEN** the "Acme" header is gone, and A1 and A2 appear at the end of the ungrouped tasks with their dates and links unchanged

#### Scenario: Delete a group with its tasks
- **WHEN** the user deletes "Acme" and chooses to delete its tasks
- **THEN** the header and both tasks are removed, links pointing to them are removed, and their successors keep their dates as manually scheduled tasks if they have no remaining predecessors

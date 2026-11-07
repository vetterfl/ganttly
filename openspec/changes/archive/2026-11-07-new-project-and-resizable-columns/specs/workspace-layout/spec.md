# Spec Delta

## MODIFIED Requirements

### Requirement: Command ribbon
The page SHALL have a top title bar showing the app name and an editable project title. Below it, a command ribbon SHALL group the commands under labelled groups: Task (Add task), Share (Copy link), View (zoom out, zoom level label, zoom in) and File (New, Print).

#### Scenario: Ribbon groups
- **WHEN** the page loads
- **THEN** the ribbon shows the groups Task, Share, View and File, each labelled and containing its commands

#### Scenario: Edit project title
- **WHEN** the user changes the project title in the title bar
- **THEN** the browser tab title and the share link update to the new title

#### Scenario: Copy link
- **WHEN** the user clicks Copy link
- **THEN** a link containing the full chart state is copied to the clipboard and a toast confirms it

## ADDED Requirements

### Requirement: New project command
The New command SHALL replace the current project with an empty project titled "Untitled Project": no tasks, default zoom, and all detail strips closed. If the current project has at least one task, the user SHALL confirm first. The previous project SHALL remain reachable with the browser's Back button.

#### Scenario: Confirm and clear
- **WHEN** the project has 7 tasks and the user clicks New and confirms
- **THEN** the grid shows the empty-state prompt, the title reads "Untitled Project", and the share link describes an empty project

#### Scenario: Cancel keeps the project
- **WHEN** the user clicks New and cancels the confirmation
- **THEN** the project, its URL and the browser history are unchanged

#### Scenario: No confirmation for an empty project
- **WHEN** the project has no tasks and the user clicks New
- **THEN** the project is reset immediately, without a confirmation

#### Scenario: Back restores the previous project
- **WHEN** the user confirms New and then presses the browser's Back button
- **THEN** the previous project is shown again with all its tasks, links and title

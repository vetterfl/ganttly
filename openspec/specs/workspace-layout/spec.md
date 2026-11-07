# workspace-layout Specification

## Purpose

Defines the overall page shell (command ribbon, full-width grid and timeline split view, shared scrolling and print layout) so the app feels like a desktop project-planning workspace.

## Requirements

### Requirement: Command ribbon
The page SHALL have a top title bar showing the app name and an editable project title. Below it, a command ribbon SHALL group the commands under labelled groups: Task (Add task), Share (Copy link), View (zoom out, zoom slider, zoom label, zoom in, Fit) and File (New, Print).

#### Scenario: Ribbon groups
- **WHEN** the page loads
- **THEN** the ribbon shows the groups Task, Share, View and File, each labelled and containing its commands

#### Scenario: Edit project title
- **WHEN** the user changes the project title in the title bar
- **THEN** the browser tab title and the share link update to the new title

#### Scenario: Copy link
- **WHEN** the user clicks Copy link
- **THEN** a link containing the full chart state is copied to the clipboard and a toast confirms it

#### Scenario: Zoom slider
- **WHEN** the user drags the zoom slider to its right end
- **THEN** the timeline zooms to its maximum (one day is 120px wide), and the slider, label and ± buttons stay in sync

### Requirement: Full-width split view
Below the ribbon, the workspace SHALL fill the full width and remaining height of the browser window, with the task grid on the left and the timeline on the right and no maximum-width cap.

#### Scenario: Wide window
- **WHEN** the browser window is 2560px wide
- **THEN** the grid and timeline together span the full 2560px, edge to edge

### Requirement: Shared scrolling
The grid and the timeline SHALL scroll vertically together. The timeline SHALL scroll horizontally on its own while the grid stays in place, and both panes' column headers SHALL stay visible while scrolling.

#### Scenario: Vertical scroll
- **WHEN** the user scrolls down in a chart with more tasks than fit on screen
- **THEN** grid rows and timeline lanes move together and stay aligned, and both header rows stay visible

#### Scenario: Horizontal scroll
- **WHEN** the user scrolls the timeline horizontally
- **THEN** the grid columns stay visible in place

### Requirement: Narrow screens
On viewports narrower than 980px, the grid SHALL show only the ID, expand toggle and Task Name columns. Other values SHALL remain editable in the expanded detail strip, and the page SHALL NOT scroll horizontally outside the timeline.

#### Scenario: Phone width
- **WHEN** the viewport is 390px wide
- **THEN** the grid shows ID, toggle and Task Name, the timeline is scrollable next to or below it, and the page body has no horizontal scrollbar

#### Scenario: Dates on narrow screens
- **WHEN** the viewport is narrower than 980px and the user expands a row
- **THEN** the detail strip also shows Start, Finish and Duration inputs

### Requirement: Print layout
Printing SHALL produce a landscape page with the project title, the grid columns (as read-only values) and the timeline. The ribbon, expand toggles, detail strips and toasts SHALL be left out.

#### Scenario: Print preview
- **WHEN** the user clicks Print
- **THEN** the print preview shows the title, the read-only task table and the bars, with no buttons, inputs or detail strips

### Requirement: Settings command in ribbon
The command ribbon SHALL include a View Settings command in the View group that opens the View Settings dialog.

#### Scenario: Open settings
- **WHEN** the user clicks the Settings command in the View group
- **THEN** the View Settings dialog opens with focus on its first control

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

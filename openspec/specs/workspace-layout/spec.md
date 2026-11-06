# workspace-layout Specification

## Purpose

Defines the overall page shell (command ribbon, full-width grid and timeline split view, shared scrolling and print layout) so the app feels like a desktop project-planning workspace.

## Requirements

### Requirement: Command ribbon
The page SHALL have a top title bar showing the app name and an editable project title. Below it, a command ribbon SHALL group the commands under labelled groups: Task (Add task), Share (Copy link), View (zoom out, zoom level label, zoom in) and File (Print).

#### Scenario: Ribbon groups
- **WHEN** the page loads
- **THEN** the ribbon shows the groups Task, Share, View and File, each labelled and containing its commands

#### Scenario: Edit project title
- **WHEN** the user changes the project title in the title bar
- **THEN** the browser tab title and the share link update to the new title

#### Scenario: Copy link
- **WHEN** the user clicks Copy link
- **THEN** a link containing the full chart state is copied to the clipboard and a toast confirms it

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

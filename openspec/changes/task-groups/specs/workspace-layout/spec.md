# Spec Delta

## MODIFIED Requirements

### Requirement: Command ribbon
The page SHALL have a top title bar showing the app name and an editable project title. Below it, a command ribbon SHALL group the commands under labelled groups: Task (Add task, Add group), Share (Copy link), View (zoom out, zoom slider, zoom label, zoom in, Fit) and File (New, Print).

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

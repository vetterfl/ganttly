# Spec Delta

## MODIFIED Requirements

### Requirement: Settings dialog
The system SHALL provide a Settings dialog, opened from the ribbon, that applies each change immediately and can be closed with a Close button, the Escape key or a click outside the dialog. Besides the view settings, the dialog SHALL have a Project section, visually separated and labelled as saved with the project, whose options belong to the open project and its share link rather than to the browser.

#### Scenario: Live apply
- **WHEN** the user switches row density in the dialog
- **THEN** the grid and timeline change density immediately, while the dialog stays open

#### Scenario: Close with Escape
- **WHEN** the dialog is open and the user presses Escape
- **THEN** the dialog closes and focus goes back to the Settings button

#### Scenario: Project options are not view settings
- **WHEN** the user switches the project to working days in the Project section and then opens a different project's link in the same browser
- **THEN** the other project opens in its own calendar, not in working days

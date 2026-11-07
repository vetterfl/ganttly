# Spec Delta

## ADDED Requirements

### Requirement: Column widths are view settings
Grid column widths SHALL be remembered per browser together with the other view settings. They SHALL NOT be included in share links, and "Reset to defaults" SHALL restore the default widths.

#### Scenario: Width survives reload
- **WHEN** the user widens the Task Name column and reloads the page
- **THEN** the Task Name column keeps its new width

#### Scenario: Not shared
- **WHEN** a user with a widened Task Name column copies the share link and a first-time visitor opens it
- **THEN** the visitor sees default column widths

#### Scenario: Reset restores widths
- **WHEN** the user has resized several columns and clicks "Reset to defaults"
- **THEN** every column returns to its default width

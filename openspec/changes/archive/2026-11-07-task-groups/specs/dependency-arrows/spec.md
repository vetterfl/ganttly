# Spec Delta

## ADDED Requirements

### Requirement: Arrows of collapsed groups
Arrows whose predecessor or successor is hidden by a collapsed group SHALL NOT be drawn. They SHALL reappear when the group is expanded. Scheduling SHALL be unaffected by collapsing.

#### Scenario: Collapse hides arrows
- **WHEN** task 2 in "Acme" links to task 5 in "Globex" and the user collapses "Acme"
- **THEN** the arrow from 2 to 5 is not drawn, task 5 keeps its scheduled dates, and expanding "Acme" draws the arrow again

# Spec Delta

## MODIFIED Requirements

### Requirement: Notation and date format settings
The dialog SHALL offer link notation (Same as app language, German EA/AA/EE/AE with T, or English FS/SS/FF/SF with d; default Same as app language, which means German notation in a German app and English notation otherwise) and date format (Language default, ISO YYYY-MM-DD, or DD.MM.YYYY; default Language default, which formats dates in the app language). The date format SHALL apply everywhere dates are shown. Predecessor entries in either notation SHALL be accepted regardless of these settings.

#### Scenario: First visit notation
- **WHEN** a user opens Ganttly for the first time in a browser and the app language is German
- **THEN** predecessors are shown in German notation

#### Scenario: Date format
- **WHEN** the user picks DD.MM.YYYY
- **THEN** the Start and Finish cells, the timeline tooltip and the chart subtitle show dates like 10.11.2026

#### Scenario: Notation follows the app language
- **WHEN** the link notation is Same as app language and the user switches the app language from German to English
- **THEN** a predecessor shown as `4EE-2T` is shown as `4FF-2d`

#### Scenario: Explicit notation wins
- **WHEN** the user picks German notation and the app language is English
- **THEN** predecessors are shown in German notation

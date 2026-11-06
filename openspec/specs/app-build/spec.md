# app-build Specification

## Purpose

Defines the developer-facing contract for building, running, testing and checking Ganttly as a web app, so anyone can work on it and deploy it as static files.

## Requirements

### Requirement: Development server
`npm run dev` SHALL start a local development server with hot reload that serves the app.

#### Scenario: Start dev server
- **WHEN** a developer runs `npm install` then `npm run dev` on a fresh clone
- **THEN** a local URL is printed and opening it shows the working app

### Requirement: Static production build
`npm run build` SHALL type-check the project and write a self-contained static site to `dist/`. The site SHALL work when served from any path (domain root or a sub-directory) without a server-side component.

#### Scenario: Serve from a sub-path
- **WHEN** `dist/` is copied to a static host under `/tools/gantt/`
- **THEN** the app loads and share links copied from it point to `/tools/gantt/?d=…`

#### Scenario: Type error fails the build
- **WHEN** the code contains a TypeScript type error
- **THEN** `npm run build` exits non-zero

### Requirement: Tests and checks
`npm test` SHALL run the unit test suite once and exit non-zero on failure. `npm run lint` SHALL run the linter and type-checker and exit non-zero on any error.

#### Scenario: Single test file
- **WHEN** a developer runs `npx vitest run src/scheduling/schedule.test.ts`
- **THEN** only that file's tests run

#### Scenario: Lint passes on main
- **WHEN** `npm run lint` is run on the delivered code
- **THEN** it exits 0

# E2E Tests — 织梦机 (Zhimengji)

End-to-end tests for the 织梦机 v1.3 app using [Playwright](https://playwright.dev/).

## Prerequisites

- Node.js 18+
- npm dependencies installed: cd G:/AI/Chancellor-OS-Lab/projects/zhimengji && npm install

## How to Run

### 1. Start the Vite dev server (in a separate terminal)

`ash
cd G:/AI/Chancellor-OS-Lab/projects/zhimengji
npm run dev
`

The Vite dev server starts on http://localhost:1420.

### 2. Run the Playwright tests

In another terminal:

`ash
cd G:/AI/Chancellor-OS-Lab/projects/zhimengji
npx playwright test
`

To run a specific test file:

`ash
npx playwright test e2e/core-paths.spec.ts
`

To run tests in headed mode (watch the browser):

`ash
npx playwright test --headed
`

### All-in-one (auto-starts dev server)

If no server is already running, Playwright's webServer config will start it automatically:

`ash
npx playwright test
`

## Test Structure

| Test | File | Description |
|------|------|-------------|
| Path 1+2 | core-paths.spec.ts | Bookshelf -> Create Project -> Editor view |
| Path 3 | core-paths.spec.ts | AI Chat page — input, send, response |
| Path 4 | core-paths.spec.ts | AI Settings overlay — tabs, close |
| Path 5 | core-paths.spec.ts | Canvas view — sub-tabs, zoom controls |
| Path 6 | core-paths.spec.ts | Judgment Records — tabs, filters |

Additional existing tests cover story creation, multi-board canvas, canon management,
judgment records, object lifecycle, cross-book, and decision chain.

## Notes

- All tests mock the Tauri IPC layer so the React app renders in a plain browser.
- No Tauri backend or native window is required.
- The webServer config in playwright.config.ts manages the Vite dev server lifecycle.
- Tests use ddInitScript to inject mock implementations of
  window.__TAURI_INTERNALS__.invoke before any app code loads.

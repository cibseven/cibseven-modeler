# Agent Instructions — cibseven-modeler

Guidance for AI coding agents (Claude Code, Copilot, Codex, Cursor, …) working in this repository.

## Project Overview
A BPMN/DMN/Form process modeler **component library** (Vue 3, published to npm as `cibseven-modeler`, UMD/ES module). It is **not a standalone application** and has **no backend in this repo** — it is embedded by `cibseven-webclient`, extended by `cibseven-modeler-ee`, and consumed by flow. The `vite` dev server (`npm run dev` + `index.html`) is a local development harness only.

The modeler's REST backend (element templates, diagrams, sessions — `org.cibseven.modeler.*`) lives in the **cibseven-webclient** repository (`cibseven-webclient-core`), not here.

## Tech Stack
- **Frontend:** Vue 3 with **Composition API** (`<script setup>` SFCs), Vite, vue-router 5 (hash history, dev harness), Vuex 4 (namespaced modules), axios, vue-i18n
- **BPMN/DMN:** bpmn-js, dmn-js, bpmn-js-properties-panel, form-js, Monaco Editor, bpmnlint (local plugin in `bpmnlint-plugin-local/`)
- **UI:** Bootstrap 5, SCSS/LESS, Material Design Icons (`@mdi/font`), `@cib/bootstrap-components`
- **Testing:** Vitest + @vue/test-utils (unit, jsdom)
- **Linting:** ESLint 9 flat config + eslint-plugin-vue (no Prettier)

## Coding Conventions

### Vue Components
- **Always use `<script setup>` syntax (Composition API)**, never Options API
- PascalCase file names: `ActionButtonsList.vue`, `StartPage.vue`
- Every `.vue` file must start with an Apache 2.0 license header as HTML comment; every `.js` file as block comment
- Template → Script → Style ordering in SFCs
- Use **composables** (`use` prefix) for reusable logic: `useModeler.js`, `useForm.js`, `useResizable.js`
- **Global listeners must be cleaned up:** every `window`/`document` `addEventListener` needs a paired `removeEventListener` in `onBeforeUnmount`/`onUnmounted` (same handler reference, same capture flag). Prefer an existing composable (e.g. `useResizable`) that auto-cleans.
- Destroy bpmn-js/dmn-js instances in `onUnmounted` (not `onBeforeUnmount` — children may still need them during teardown)
- Accessibility: keyboard-accessible interactive elements, `alt` on images, `aria-hidden="true"` on decorative icons, labels on form inputs

### State Management
- Vuex 4 with namespaced modules (NOT Pinia)
- The modeler store uses a factory pattern: `createModelerStore()` (`src/store.js`) — this must remain intact; host apps register the returned modules

### Services & API
- Service files in `src/services/`: `elementTemplateService.js`, `processService.js`, …, plus `servicesConfig.js` for the base path
- The services base path is a module-global (default `services/v1`) set via `setServicesBasePath()` — host applications configure it at startup; never hardcode URL prefixes
- The axios instance is injected by the host via `setAxiosInstance()` — do not create ad-hoc axios instances for API calls
- Use `async/await` (not `.then()` chains)

### Styling
- Bootstrap 5 classes for layout; SCSS for custom styles, LESS for bpmn-js related styling; `mdi-*` icon classes

### Build & Distribution
- Library build: `npm run build` (= `cross-env BUILD_MODE=library vite build`) → `dist/cibseven-modeler.es.js` + `.umd.js` + `.css`
- Singleton/identity-bearing packages (vue, bpmn-js, dmn-js, diagram-js, …) must be **peer dependencies**, never bundled — duplicated copies break `instanceof` checks and module-global state
- NPM exact versions are enforced via the `check-exact` script

### i18n
- Translation files in `src/resources/translations/` (`translations_*.json`); keep all languages (de, en, es, ru, ua) in sync when adding keys

## Testing & Coverage (required for every commit)
- **Every commit that changes production code must include new or updated tests covering that change.** Bug fixes need a regression test; new features need tests for the main paths.
- Unit tests live in `src/__tests__/` (Vitest, jsdom, `@vue/test-utils`); composables have their own tests under `src/__tests__/composables/`.
- Before committing, verify coverage of the code you touched:
  - Full run: `npm run test:coverage` (istanbul; reports in `target/coverage/`)
  - Scoped check: `npx vitest run <test files> --coverage --coverage.include="src/<changed files>"`
- **Aim for ≥ 80% line coverage on new/changed files, and never reduce overall coverage.** If a change is genuinely untestable (build config, generated code), say so explicitly in the PR/commit description.
- Tests must assert behavior — no assertion-free or snapshot-only padding to inflate numbers.

## Git Conventions
- One-line conventional commit messages: `type(scope): summary` (e.g. `fix(StartPage): …`); no body, no trailers.
- Never commit `.npmrc` changes (contains registry credentials).
- If a dependency was temporarily switched to a local `file:` link for testing, revert it (and the lockfile) before committing.

## Important Notes
- This project is consumed as a library by `cibseven-webclient` and `cibseven-modeler-ee` — maintain backwards-compatible exports in `src/library.js`
- The EE extension injects features through the plugin/hook slots (`registerPlugin`, `provide`d `*Hook`s) — keep those extension points stable

## Code Style
- Prefer `const` over `let`; never use `var`
- Template literals over string concatenation; optional chaining (`?.`) and nullish coalescing (`??`)
- `async/await` over `.then()` chains; prefer early returns over deep nesting
- kebab-case event names in templates (`@my-event`)

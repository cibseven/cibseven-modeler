# Copilot Instructions for cibseven-modeler

## Project Overview
This is a BPMN/DMN process modeler built as a multi-module Maven project with a Vue 3 frontend. It supports **app mode** (standalone SPA) and **library mode** (consumed by cibseven-webclient as UMD/ES module).

## Tech Stack
- **Frontend:** Vue 3 with **Composition API** (`<script setup>` SFCs), Vite, vue-router 4 (hash history), Vuex 4 (namespaced modules), axios, vue-i18n
- **Backend:** Java 17, Spring Boot 3.5.x (Jakarta EE), Spring MVC REST controllers, SpringDoc OpenAPI
- **BPMN/DMN:** bpmn-js, dmn-js, bpmn-js-properties-panel, Monaco Editor
- **UI:** Bootstrap 5, SCSS/LESS, Material Design Icons (`@mdi/font`), `@cib/bootstrap-components`
- **Testing:** Vitest + @vue/test-utils (unit), Cypress (E2E), Spring Boot Test + JUnit (backend)
- **Linting:** ESLint 9 flat config + eslint-plugin-vue + Prettier

## Coding Conventions

### Vue Components
- **Always use `<script setup>` syntax (Composition API)**, never Options API
- PascalCase file names: `ActionButtonsList.vue`, `ModelerCanvas.vue`
- Every `.vue` file must start with an Apache 2.0 license header as HTML comment; every `.js` file as block comment
- Template → Script → Style ordering in SFCs
- Use **composables** (`use` prefix) for reusable logic: `useModeler.js`, `useForm.js`
- Accessibility: keyboard-accessible interactive elements, `alt` on images, `aria-hidden="true"` on decorative icons, labels on form inputs

### State Management
- Use Vuex 4 with namespaced modules (NOT Pinia)
- PascalCase filenames: `ProcessStore.js`
- The modeler store uses a factory pattern: `createModelerStore()`

### Services & API
- PascalCase service files in `src/services/`: `ModelerService.js`, `processService.js`
- Use axios for HTTP requests
- Use `async/await` (not `.then()` chains) for asynchronous code

### Routing
- vue-router 4 with `createWebHashHistory`
- Lazy-load route components with dynamic `import()`

### Styling
- Bootstrap 5 classes for layout and components
- SCSS for custom styles, LESS for bpmn-js related styling
- Material Design Icons via `mdi-*` CSS classes

### Testing
- Unit tests in `src/__tests__/` with Vitest (jsdom) and `@vue/test-utils`
- E2E: Cypress in `cypress/`

### Build & Distribution
- Frontend code in `frontend/` subdirectory, built by Maven `frontend-maven-plugin`
- Library mode: `cross-env BUILD_MODE=library vite build`

### Java Backend
- Package root: `org.cibseven.modeler.*`
- REST endpoints use `@RestController` + `@RequestMapping` + `@Operation` Swagger annotations
- Use constructor injection (not field `@Autowired`); Lombok `@Data`/`@Value` for DTOs
- Logging: SLF4J + Log4j2

## Important Notes
- This project is consumed as a library by `cibseven-webclient` — maintain backwards-compatible exports
- The store factory pattern (`createModelerStore()`) must remain intact
- NPM exact versions are enforced via `check-exact` script

## Code Style
- Prefer `const` over `let`; never use `var`
- Use template literals instead of string concatenation
- Use optional chaining (`?.`) and nullish coalescing (`??`)
- Use `async/await` instead of `.then()` chains
- Prefer early returns over deeply nested if/else
- Use kebab-case for event names in templates (`@my-event`)

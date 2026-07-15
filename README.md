# CIB seven Modeler

A BPMN / DMN / Form process modeler for the CIB seven platform, built on [bpmn-js](https://bpmn.io/toolkit/bpmn-js/), dmn-js and form-js.

This repository contains a Vue 3 **component library** (published to npm as `cibseven-modeler`). It is not a standalone application: it is embedded by [cibseven-webclient](https://github.com/cibseven/cibseven-webclient), extended by the Enterprise Edition (`cibseven-modeler-ee`), and consumed by CIB flow. The modeler's REST backend (element templates, diagrams, editing sessions) lives in the **cibseven-webclient** repository (`cibseven-webclient-core`, package `org.cibseven.modeler.*`) — not here.

## Features

- BPMN 2.0 modeling (Camunda 7 profile), DMN decision tables/DRD, and form modeling
- Properties panel, element templates (with icons, filtering and scoped groups), Monaco-based script editing
- BPMN linting via bpmnlint (including a local custom rule plugin)
- Start page with diagram search, filters and recent diagrams
- Extension points (plugin slots and provide/inject hooks) used by the Enterprise Edition

## Architecture Notes

- **Library entry:** `src/library.js` — all public exports; keep them backwards compatible, consumers depend on them.
- **Store:** Vuex 4 via the factory `createModelerStore()` (`src/store.js`); host applications register the returned modules.
- **Host integration contract:** the host application injects its HTTP setup at startup:
  - `setServicesBasePath(path)` — REST base path (default `services/v1`); never hardcode URL prefixes
  - `setAxiosInstance(axios)` — shared axios instance (carries auth headers)
- **Extension points:** `registerPlugin(slot, component)` plus `provide`d `*Hook`s consumed by `CibsevenModeler` — the EE package builds on these; keep them stable.
- **Peer dependencies:** singleton/identity-bearing packages (vue, bpmn-js, dmn-js, diagram-js, …) are peers and must never be bundled — duplicate copies break `instanceof` checks and module-global state.

## Development

```sh
npm install            # install dependencies (exact versions enforced — see check-exact)
npm run dev            # local development harness (Vite dev server)
npm run test           # unit tests (Vitest + @vue/test-utils, jsdom)
npm run test:coverage  # tests with istanbul coverage (reports in target/coverage/)
npm run lint           # ESLint 9 flat config
npm run build          # library build -> dist/cibseven-modeler.es.js / .umd.js / .css
```

To test local changes inside a host application, temporarily point the host's `package.json` at this folder (`"cibseven-modeler": "file:../cibseven-modeler"`), rebuild (`npm run build`), and `npm install` in the host. Revert the `file:` link (and lockfile) before committing.

## BPMN Linting

Lint rules are configured in `.bpmnlintrc` and packed into `linterConfig.js`. After changing rules, regenerate with:

```sh
npx bpmnlint-pack-config -c .bpmnlintrc -o linterConfig.js -t es
```

`bpmnlint-plugin-local/` contains a customized `no-overlapping-elements` rule (adds an optional-chaining guard for DataStoreReference DI objects). The stock rule is set to `off` and the local variant to `warn`. When updating `bpmn-js-bpmnlint`, check whether the upstream bug is fixed so the custom rule can be removed.

## Publishing

Published to the CIB seven npm registry (`artifacts.cibseven.org/repository/npm-hosted/`) via the CI pipeline (`Jenkinsfile`). Exact dependency versions are enforced — run `npm run check-exact` before releasing.

## Documentation

- User and configuration documentation: [CIB seven docs → Webapps → Modeler](https://docs.cibseven.org/manual/latest/webapps/modeler/)
- Agent/contributor conventions: [AGENTS.md](AGENTS.md)

## License

Apache License 2.0 — see [LICENSE](LICENSE).

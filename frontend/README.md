# CIB seven Modeler

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur)
- [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## Customize Configuration

See [Vite Configuration Reference](https://vitejs.dev/config/).

## Project Setup

To set up the project, follow these steps:

1. **Install Dependencies**

    ```sh
    npm install
    ```

2. **Create `.env` File**

    To run the project locally, create a `.env` file in the root of the `frontend` folder with the following content:

    ```
    VITE_BASE_URL=http://localhost:8090/cibseven-modeler/
    VITE_BASE_URL_CIBSEVEN=http://localhost:8090
    VITE_CLIENT=client/
    ```

3. **Compile and Hot-Reload for Development**

    ```sh
    npm run dev
    ```

4. **Compile and Minify for Production**

    ```sh
    npm run build
    ```

5. **Lint with [ESLint](https://eslint.org/)**

    ```sh
    npm run lint
    ```

6. **Update BPMN Lint Rules**

    If there have been changes to the BPMN lint rules in the .bpmnlint file, update the configuration by running the following command inside the `frontend` folder:

    ```sh
    npx bpmnlint-pack-config -c .bpmnlintrc -o linterConfig.js -t es
    ```

## BPMNLint Bug Fix Implementation

To address a bug in the BPMN library related to DataStoreReference, we have overridden the no-overlapping-elements rule with a custom version.

The modified line is number 70, where an optional chaining operator has been added:
```javascript
if (isOutsideParentBoundary(diObjects.get(element)?.bounds, parentDi.bounds))
```

Currently, the .bpmnlint file is configured so it doesn't take the default configuration:
```json
"rules": {
    "no-overlapping-elements": "off",
    "local/custom-no-overlapping-elements": "warn"
}
```

The value 'off' tells the library to not take the custom script, and local/custom-no-overlapping-elements to take the custom one.

For future updates of bpmn-js-bpmnlint please check first if this issue has been solved to remove the custom script and keep the library up to date.

## Local Development Setup

Ensure you have the `.env` file set up as described above. This configuration is necessary for the application to interact correctly with the local development environment.

## Additional Resources

For more information on configuration and usage, check out:

- [Vite Documentation](https://vitejs.dev/)
- [Vue 3 Documentation](https://v3.vuejs.org/)
- [ESLint Documentation](https://eslint.org/)

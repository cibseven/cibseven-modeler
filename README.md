# CIB seven Modeler

A BPMN and DMN modeling application that can be used standalone or integrated as a library in other applications.

## Project Structure

```
cibseven-modeler/
├── frontend/           # Vue.js frontend (can be exported as NPM library)
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── services/       # API services
│   │   ├── assets/         # CSS and static assets
│   │   ├── main.js         # Application entry point
│   │   └── library.js      # Library entry point
│   ├── package.json
│   └── vite.config.js
├── cibseven-modeler-core/  # Java core module (models, repositories)
└── cibseven-modeler-web/   # Java web module (REST services, Spring Boot)
```

## Development

### Prerequisites

- Java 17+
- Node.js 18+
- Maven 3.8+

### Building

```bash
# Build everything (frontend + backend)
mvn clean install

# Build only backend
mvn clean install -pl cibseven-modeler-core,cibseven-modeler-web

# Build only frontend
cd frontend
npm ci
npm run build
```

### Running in Development

```bash
# Start backend
cd cibseven-modeler-web
mvn spring-boot:run -Dspring-boot.run.profiles=local

# Start frontend (in another terminal)
cd frontend
npm run dev
```

The frontend development server will proxy API requests to `http://localhost:8093`.

## Using as a Library

The frontend can be built and published as an NPM library for use in other applications.

### Publishing the Library

```bash
# Build library
cd frontend
npm run build:library

# Publish (requires proper NPM registry configuration)
npm publish
```

### Using in Another Project

```javascript
// Install
npm install cibseven-modeler

// Import components
import { BpmnModeler, DmnModeler, FormModeler } from 'cibseven-modeler'

// Or use as Vue plugin
import CibsevenModeler from 'cibseven-modeler'
app.use(CibsevenModeler)
```

### Available Exports

**Components:**
- `CibsevenModeler` - Main wrapper component with toolbar
- `BpmnModeler` - BPMN diagram modeler
- `DmnModeler` - DMN decision table modeler
- `FormModeler` - Form builder

**Services:**
- `ModelerService` - API service for backend operations

**Utilities:**
- `parseXml` - XML parsing utility
- `base64Decode` - Base64 decoding utility
- `applyTheme` - Theme switching utility

**Store & i18n:**
- `store` - Vuex store instance
- `createModelerStore` - Factory to create custom store
- `i18n` - Vue i18n instance
- `setLocale` - Change language function

## Configuration

### Backend Configuration

The backend uses Spring Boot configuration. Create `application-local.yaml` in `cibseven-modeler-web/src/main/resources/`:

```yaml
cibseven:
  modeler:
    cors:
      allowed-origins: http://localhost:5173

server:
  port: 8093
```

### Frontend Configuration

Environment variables can be set in `.env` files:

```env
VITE_API_BASE_URL=/cibseven-modeler
```

## License

Apache License 2.0 - See LICENSE file for details.

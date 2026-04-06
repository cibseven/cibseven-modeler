Release Notes
=============
## 1.0.0-SNAPSHOT

Initial release of CIB seven Modeler - migrated from Flow Modeler.

### Features

- BPMN 2.0 process modeling with visual editor
- DMN (Decision Model and Notation) support
- Form modeling capabilities
- Element templates support for reusable configurations
- Integration with CIB seven engine
- Multi-database support (PostgreSQL, MySQL, MariaDB, H2, Oracle)
- Flyway-based database migrations
- Monaco Editor integration for XML/JSON editing
- Internationalization support (English, German, Spanish, Russian)

### Database Schema Management

- Flyway is the schema manager. Hibernate runs in validate mode.
- Vendor-specific Flyway migrations are used. Flyway auto-detects the database vendor and loads migrations from:
    - classpath:db/migration-{vendor}
    - classpath:db/migration-common (optional shared scripts)
- Works without Spring profiles. Override migration locations via environment variable:
    - SPRING_FLYWAY_LOCATIONS=classpath:db/migration-postgresql

Behavior:
- Fresh databases: Schema is created entirely by Flyway starting from V1 baseline per vendor.
- Existing databases: Flyway adopts the schema via baseline-on-migrate=true and will migrate safely without dropping tables.

Locations of migrations:
- cibseven-modeler-core/src/main/resources/db/migration-{vendor}
    - Supported vendors: oracle, postgresql, mariadb, mysql, h2
- cibseven-modeler-core/src/main/resources/db/migration-common

Configuration highlights (cibseven-modeler-web/src/main/resources/application.yaml):
- spring.jpa.hibernate.ddl-auto=validate
- spring.flyway.enabled=true
- spring.flyway.locations=${SPRING_FLYWAY_LOCATIONS:classpath:db/migration-{vendor},classpath:db/migration-common}
- spring.flyway.baseline-on-migrate=true

- - -

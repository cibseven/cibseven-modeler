CREATE TABLE processes_diagrams (
  id varchar(36) NOT NULL,
  name varchar(50) NOT NULL,
  description varchar(150) DEFAULT NULL,
  created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active boolean NOT NULL DEFAULT true,
  diagram bytea,
  processkey varchar(100) NOT NULL,
  type varchar(35) NOT NULL DEFAULT 'bpmn-c7',
  version int NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE (processkey)
);

CREATE TABLE revinfo (
  rev serial NOT NULL,
  revtstmp bigint DEFAULT NULL,
  PRIMARY KEY (rev)
);

CREATE TABLE processes_diagrams_aud (
  id varchar(36) NOT NULL,
  rev int NOT NULL,
  revtype smallint DEFAULT NULL,
  active boolean DEFAULT true,
  created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description varchar(150) DEFAULT NULL,
  diagram bytea,
  diagram_mod boolean DEFAULT NULL,
  name varchar(100) DEFAULT NULL,
  processkey varchar(100) DEFAULT NULL,
  type varchar(35) DEFAULT 'bpmn-c7',
  updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id, rev)
);

CREATE SEQUENCE hibernate_sequence
  START 1
  INCREMENT 1
  MINVALUE 1
  MAXVALUE 9223372036854775807
  CACHE 1;

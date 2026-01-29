CREATE TABLE processes_diagrams (
  id varchar(36) NOT NULL,
  name varchar(50) NOT NULL,
  description varchar(150) DEFAULT NULL,
  created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  active tinyint(1) NOT NULL DEFAULT 1,
  diagram longblob,
  processkey varchar(100) NOT NULL,
  type varchar(35) NOT NULL DEFAULT 'bpmn-c7',
  version int NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE (processkey)
);

CREATE TABLE revinfo (
  rev int(11) NOT NULL AUTO_INCREMENT,
  revtstmp bigint(20) DEFAULT NULL,
  PRIMARY KEY (rev)
);

CREATE TABLE processes_diagrams_aud (
  id varchar(36) NOT NULL,
  rev int(11) NOT NULL,
  revtype smallint(6) DEFAULT NULL,
  active tinyint(1) DEFAULT 1,
  created timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  description varchar(150) DEFAULT NULL,
  diagram longblob,
  diagram_mod tinyint(1) DEFAULT NULL,
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

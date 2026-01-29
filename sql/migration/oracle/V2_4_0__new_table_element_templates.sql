-- Create element_templates table for storing BPMN element templates
CREATE TABLE element_templates (
  id VARCHAR2(36 CHAR) NOT NULL,
  active NUMBER(1) NOT NULL DEFAULT 1,
  version NUMBER(11) DEFAULT 1,
  template_id VARCHAR2(100 CHAR) NOT NULL,
  name VARCHAR2(200 CHAR) NOT NULL,
  description CLOB,
  origin VARCHAR2(50 CHAR) NOT NULL,
  content CLOB,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR2(100 CHAR),
  updated_by VARCHAR2(100 CHAR),
  PRIMARY KEY (id),
  UNIQUE (template_id)
);

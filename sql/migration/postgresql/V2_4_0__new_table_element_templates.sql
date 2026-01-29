-- Create element_templates table for storing BPMN element templates
CREATE TABLE element_templates (
  id VARCHAR(36) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  version INT DEFAULT 1,
  template_id VARCHAR(100) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  origin VARCHAR(50) NOT NULL,
  content TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  PRIMARY KEY (id),
  UNIQUE (template_id)
);

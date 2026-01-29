CREATE TABLE user_sessions (
  id VARCHAR2(36) PRIMARY KEY NOT NULL,
  user_id VARCHAR2(255) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  expires_at TIMESTAMP,
  CONSTRAINT fk_user_session_id FOREIGN KEY (id) REFERENCES diagram_usage(id) ON DELETE CASCADE
);

CREATE TABLE diagram_usage (
  id VARCHAR2(36) PRIMARY KEY NOT NULL,
  user_id VARCHAR2(255) NOT NULL,
  diagram_id VARCHAR2(36) NOT NULL,
  session_id VARCHAR2(36) NOT NULL,
  opened_at TIMESTAMP NOT NULL,
  closed_at TIMESTAMP,
  CONSTRAINT fk_diagram_id FOREIGN KEY (diagram_id) REFERENCES processes_diagrams(id) ON DELETE CASCADE,
  CONSTRAINT fk_session_id FOREIGN KEY (session_id) REFERENCES user_sessions(id) ON DELETE CASCADE
)

-- Increase the size of the name column in processes_diagrams table
ALTER TABLE processes_diagrams MODIFY COLUMN name VARCHAR(255) NOT NULL;

-- Increase the size of the name column in processes_diagrams_aud table
ALTER TABLE processes_diagrams_aud MODIFY COLUMN name VARCHAR(255) DEFAULT NULL;

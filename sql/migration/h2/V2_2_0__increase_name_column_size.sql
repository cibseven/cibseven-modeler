-- Increase the size of the name column in processes_diagrams table
ALTER TABLE processes_diagrams ALTER COLUMN name VARCHAR(255) NOT NULL;

-- Increase the size of the name column in processes_diagrams_aud table
ALTER TABLE processes_diagrams_aud ALTER COLUMN name VARCHAR(255) DEFAULT NULL;

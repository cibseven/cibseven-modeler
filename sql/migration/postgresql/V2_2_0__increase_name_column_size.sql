-- Increase the size of the name column in processes_diagrams table
ALTER TABLE processes_diagrams ALTER COLUMN name TYPE VARCHAR(255);

-- Increase the size of the name column in processes_diagrams_aud table
ALTER TABLE processes_diagrams_aud ALTER COLUMN name TYPE VARCHAR(255);

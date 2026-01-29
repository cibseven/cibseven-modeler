-- Increase the size of the name column in processes_diagrams table
ALTER TABLE processes_diagrams MODIFY name VARCHAR(255);

-- Increase the size of the name column in processes_diagrams_aud table
ALTER TABLE processes_diagrams_aud MODIFY name VARCHAR(255);

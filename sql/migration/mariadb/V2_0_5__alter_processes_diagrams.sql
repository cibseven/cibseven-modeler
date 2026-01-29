ALTER TABLE `processes_diagrams_aud` ADD COLUMN `version` INT(11);
ALTER TABLE `processes_diagrams` CHANGE COLUMN `name` `name` VARCHAR(100) NOT NULL ;

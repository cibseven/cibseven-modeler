-- Create element_templates table for storing BPMN element templates
CREATE TABLE `element_templates` (
  `id` varchar(36) NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `version` int(11) DEFAULT '1',
  `template_id` varchar(100) NOT NULL,
  `name` varchar(200) NOT NULL,
  `description` longtext,
  `origin` varchar(50) NOT NULL,
  `content` longtext,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_by` varchar(100) DEFAULT NULL,
  `updated_by` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `template_id` (`template_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

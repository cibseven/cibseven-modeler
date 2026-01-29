CREATE TABLE `forms` (
  `id` varchar(36) NOT NULL,
  `description` varchar(150) DEFAULT NULL,
  `created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `updated` timestamp NOT NULL DEFAULT '0000-00-00 00:00:00',
  `active` tinyint(1) NOT NULL DEFAULT '1',
  `form_schema` longblob NOT NULL,
  `formid` varchar(100) NOT NULL,
  `version` int(11) DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `formid` (`formid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- MySQL dump for homesfy_chat database
-- Generated for Homesfy Chat Buddy
-- 
-- This dump file contains the complete database structure
-- Import this file to create the database and all tables
--
-- Usage:
--   mysql -h [RDS_ENDPOINT] -u [USERNAME] -p < homesfy_chat_dump.sql
--   OR
--   mysql -h [RDS_ENDPOINT] -u [USERNAME] -p homesfy_chat < homesfy_chat_dump.sql

-- Set SQL mode for compatibility with AWS RDS MySQL
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS `homesfy_chat` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `homesfy_chat`;

-- Disable foreign key checks to allow dropping tables in any order
SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------------------
-- Table structure for table `users`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `username` VARCHAR(255) UNIQUE NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) DEFAULT NULL,
  `role` VARCHAR(50) DEFAULT 'user',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `sessions`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `sessions`;
CREATE TABLE `sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT DEFAULT NULL,
  `token` VARCHAR(255) UNIQUE NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `user_id` (`user_id`),
  CONSTRAINT `sessions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Table structure for table `leads`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `leads`;
CREATE TABLE `leads` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `phone` VARCHAR(20) DEFAULT NULL,
  `bhk_type` VARCHAR(50) NOT NULL,
  `bhk` INT DEFAULT NULL,
  `microsite` VARCHAR(255) NOT NULL,
  `lead_source` VARCHAR(100) DEFAULT 'ChatWidget',
  `status` VARCHAR(50) DEFAULT 'new',
  `metadata` JSON,
  `conversation` JSON,
  `location` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_leads_status` CHECK (`status` IN ('new', 'contacted', 'qualified', 'closed'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Indexes for table `leads`
-- --------------------------------------------------------

CREATE INDEX `idx_leads_phone` ON `leads` (`phone`);
CREATE INDEX `idx_leads_microsite` ON `leads` (`microsite`);
CREATE INDEX `idx_leads_status` ON `leads` (`status`);
CREATE INDEX `idx_leads_created_at` ON `leads` (`created_at`);
CREATE INDEX `idx_leads_phone_microsite` ON `leads` (`phone`, `microsite`);

-- --------------------------------------------------------
-- Table structure for table `chat_sessions`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `chat_sessions`;
CREATE TABLE `chat_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `microsite` VARCHAR(255) NOT NULL,
  `project_id` VARCHAR(255) DEFAULT NULL,
  `lead_id` INT DEFAULT NULL,
  `phone` VARCHAR(20) DEFAULT NULL,
  `bhk_type` VARCHAR(50) DEFAULT NULL,
  `conversation` JSON,
  `metadata` JSON,
  `location` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `lead_id` (`lead_id`),
  CONSTRAINT `chat_sessions_ibfk_1` FOREIGN KEY (`lead_id`) REFERENCES `leads` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Indexes for table `chat_sessions`
-- --------------------------------------------------------

CREATE INDEX `idx_chat_sessions_microsite` ON `chat_sessions` (`microsite`);
CREATE INDEX `idx_chat_sessions_lead_id` ON `chat_sessions` (`lead_id`);
CREATE INDEX `idx_chat_sessions_project_id` ON `chat_sessions` (`project_id`);

-- --------------------------------------------------------
-- Table structure for table `events`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `events`;
CREATE TABLE `events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `type` VARCHAR(100) NOT NULL,
  `project_id` VARCHAR(255) NOT NULL,
  `microsite` VARCHAR(255) DEFAULT NULL,
  `payload` JSON,
  `location` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Indexes for table `events`
-- --------------------------------------------------------

CREATE INDEX `idx_events_type` ON `events` (`type`);
CREATE INDEX `idx_events_project_id` ON `events` (`project_id`);
CREATE INDEX `idx_events_microsite` ON `events` (`microsite`);
CREATE INDEX `idx_events_created_at` ON `events` (`created_at`);

-- --------------------------------------------------------
-- Table structure for table `widget_configs`
-- --------------------------------------------------------

DROP TABLE IF EXISTS `widget_configs`;
CREATE TABLE `widget_configs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `project_id` VARCHAR(255) UNIQUE NOT NULL,
  `agent_name` VARCHAR(255) DEFAULT 'Riya from Homesfy',
  `avatar_url` VARCHAR(500) DEFAULT 'https://cdn.homesfy.com/assets/riya-avatar.png',
  `primary_color` VARCHAR(20) DEFAULT '#6158ff',
  `followup_message` TEXT NULL,
  `bhk_prompt` TEXT NULL,
  `inventory_message` TEXT NULL,
  `phone_prompt` TEXT NULL,
  `thank_you_message` TEXT NULL,
  `bubble_position` VARCHAR(20) DEFAULT 'bottom-right',
  `auto_open_delay_ms` INT DEFAULT 4000,
  `welcome_message` TEXT NULL,
  `property_info` JSON,
  `created_by` VARCHAR(255) DEFAULT NULL,
  `updated_by` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `chk_widget_configs_bubble_position` CHECK (`bubble_position` IN ('bottom-right', 'bottom-left'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------
-- Indexes for table `widget_configs`
-- --------------------------------------------------------

CREATE INDEX `idx_widget_configs_project_id` ON `widget_configs` (`project_id`);

-- --------------------------------------------------------
-- Dump completed
-- --------------------------------------------------------

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;


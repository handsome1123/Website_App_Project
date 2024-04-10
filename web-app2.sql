-- phpMyAdmin SQL Dump
-- version 5.2.0
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Apr 10, 2024 at 12:17 PM
-- Server version: 10.4.25-MariaDB
-- PHP Version: 8.1.10

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `web-app2`
--

-- --------------------------------------------------------

--
-- Table structure for table `bookings`
--

CREATE TABLE `bookings` (
  `id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `room_id` int(11) NOT NULL,
  `slot_id` int(11) NOT NULL,
  `objective` text NOT NULL,
  `date` date NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL,
  `action_by` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `bookings`
--

INSERT INTO `bookings` (`id`, `user_id`, `room_id`, `slot_id`, `objective`, `date`, `status`, `action_by`, `created_at`) VALUES
(22, 3, 1, 4, 'hh', '2024-04-10', 'approved', 2, '2024-04-10 06:00:12'),
(23, 5, 4, 23, 'opp', '2024-04-10', 'rejected', 2, '2024-04-10 09:19:22');

-- --------------------------------------------------------

--
-- Table structure for table `rooms`
--

CREATE TABLE `rooms` (
  `room_id` int(11) NOT NULL,
  `room_name` varchar(255) NOT NULL,
  `image_path` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `rooms`
--

INSERT INTO `rooms` (`room_id`, `room_name`, `image_path`) VALUES
(1, 'Room1', 'room1.jpg'),
(2, 'Room2', 'room2.jpg'),
(3, 'Room3', '1712724965173-office.jpg'),
(4, 'Room4', '1712725238098-room9.jpeg'),
(5, 'Room2', '1712725299130-office.jpg'),
(6, 'Room6', '1712724205227-room9.jpeg'),
(7, 'Room6', '1712722605027-office.jpg'),
(8, 'Pond & Handsome\' Room', '1712736195372-WIN_20240410_15_02_20_Pro.jpg');

-- --------------------------------------------------------

--
-- Table structure for table `time_slots`
--

CREATE TABLE `time_slots` (
  `slot_id` int(11) NOT NULL,
  `room_id` int(11) DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `status` enum('free','pending','reserved','disabled') NOT NULL DEFAULT 'free'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `time_slots`
--

INSERT INTO `time_slots` (`slot_id`, `room_id`, `start_time`, `end_time`, `status`) VALUES
(1, 1, '08:00:00', '10:00:00', 'free'),
(2, 1, '10:00:00', '12:00:00', 'disabled'),
(3, 1, '13:00:00', '15:00:00', 'free'),
(4, 1, '15:00:00', '17:00:00', 'reserved'),
(5, 2, '08:00:00', '10:00:00', 'free'),
(6, 2, '10:00:00', '12:00:00', 'free'),
(7, 2, '13:00:00', '15:00:00', 'free'),
(8, 2, '15:00:00', '17:00:00', 'free'),
(9, 3, '08:00:00', '10:00:00', 'free'),
(10, 3, '10:00:00', '12:00:00', 'free'),
(11, 3, '13:00:00', '15:00:00', 'free'),
(12, 3, '15:00:00', '17:00:00', 'free'),
(13, 4, '08:00:00', '10:00:00', 'free'),
(14, 4, '10:00:00', '12:00:00', 'free'),
(15, 4, '13:00:00', '15:00:00', 'free'),
(16, 4, '15:00:00', '17:00:00', 'free'),
(17, 5, '08:00:00', '10:00:00', 'free'),
(18, 5, '10:00:00', '12:00:00', 'free'),
(19, 5, '13:00:00', '15:00:00', 'free'),
(20, 5, '15:00:00', '17:00:00', 'free'),
(21, 6, '08:00:00', '10:00:00', 'free'),
(22, 6, '10:00:00', '12:00:00', 'free'),
(23, 6, '13:00:00', '15:00:00', 'free'),
(24, 6, '15:00:00', '17:00:00', 'free'),
(25, 7, '08:00:00', '10:00:00', 'free'),
(26, 7, '10:00:00', '12:00:00', 'free'),
(27, 7, '13:00:00', '15:00:00', 'free'),
(28, 7, '15:00:00', '17:00:00', 'free'),
(29, 8, '08:00:00', '10:00:00', 'free'),
(30, 8, '10:00:00', '12:00:00', 'free'),
(31, 8, '13:00:00', '15:00:00', 'free'),
(32, 8, '15:00:00', '17:00:00', 'free');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `username` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('user','admin','lecturer') NOT NULL DEFAULT 'user'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `username`, `email`, `password`, `role`) VALUES
(1, 'Handsome', 'handsome@gmail.com', '$2b$10$TQxbQttAIm25oyQWQZqU5.sLjnXVOegutRZfeINMbQrVL/bdaF6QS', 'admin'),
(2, 'Handsome', 'handsome1@gmail.com', '$2b$10$6ddx/I5TG5tBkwlAqs4FJO3ALubSd9B0IUQhbot7n7B86YqPr7kQ2', 'lecturer'),
(3, 's1', 's1@gmail.com', '$2b$10$yQWbjvQA1hWfssuuUlQVHOEmoVf1zLHwd4hOkxSdEoFAgd0HH2GV6', 'user'),
(4, 's2', 's2@gmail.com', '$2b$10$vVwOzYZ9RsaBwKXDKDt7VuxUnL5E3h5jBABgZFi6.6wwsxc1i2epG', 'user'),
(5, 'Pond', 'pond@gmail.com', '$2b$10$NL5kuh7BuO8U55jJ4MvQEOYl31KteTjzRfW9VRHbINfv/bH0llCuO', 'user'),
(6, 'Lecturer1', 'l1@gmail.com', '$2b$10$6OzFW81Oq2Km0FX1J45zpuUnVc6ENmKVebythbvFKoCzh6xe/RgA6', 'lecturer');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `bookings`
--
ALTER TABLE `bookings`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `room_id` (`room_id`),
  ADD KEY `slot_id` (`slot_id`),
  ADD KEY `bookings_ibfk_4` (`action_by`);

--
-- Indexes for table `rooms`
--
ALTER TABLE `rooms`
  ADD PRIMARY KEY (`room_id`);

--
-- Indexes for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD PRIMARY KEY (`slot_id`),
  ADD KEY `room_id` (`room_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `bookings`
--
ALTER TABLE `bookings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=24;

--
-- AUTO_INCREMENT for table `rooms`
--
ALTER TABLE `rooms`
  MODIFY `room_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `time_slots`
--
ALTER TABLE `time_slots`
  MODIFY `slot_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=33;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `bookings`
--
ALTER TABLE `bookings`
  ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`),
  ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`slot_id`) REFERENCES `time_slots` (`slot_id`);

--
-- Constraints for table `time_slots`
--
ALTER TABLE `time_slots`
  ADD CONSTRAINT `time_slots_ibfk_1` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`room_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;

-- ImageGuessr Database Seed Script
-- This script populates the database with sample data for testing

-- Clear existing data (in reverse order of dependencies)
DELETE FROM game_results;
DELETE FROM file_pairs;
DELETE FROM games;
DELETE FROM files;
DELETE FROM models;

-- Insert AI Models
INSERT INTO models (id, name, created_at, updated_at) VALUES
('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'DALL-E 3', NOW(), NOW()),
('b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'Midjourney v6', NOW(), NOW()),
('c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'Stable Diffusion XL', NOW(), NOW()),
('d4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'Adobe Firefly', NOW(), NOW());

-- Insert Real Files (photographs)
INSERT INTO files (id, url, source_type, source_id, prompt, created_at, updated_at) VALUES
-- Nature photos
('10000000-0000-4000-a000-000000000001', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000002', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000003', 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e', 'real', NULL, NULL, NOW(), NOW()),
-- Urban photos
('10000000-0000-4000-a000-000000000004', 'https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000005', 'https://images.unsplash.com/photo-1514565131-fce0801e5785', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000006', 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df', 'real', NULL, NULL, NOW(), NOW()),
-- Animal photos
('10000000-0000-4000-a000-000000000007', 'https://images.unsplash.com/photo-1583337130417-3346a1be7dee', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000008', 'https://images.unsplash.com/photo-1504006833117-8886a355efbf', 'real', NULL, NULL, NOW(), NOW()),
-- Portrait photos
('10000000-0000-4000-a000-000000000009', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330', 'real', NULL, NULL, NOW(), NOW()),
('10000000-0000-4000-a000-000000000010', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d', 'real', NULL, NULL, NOW(), NOW());

-- Insert Generated Files (AI-generated images - using Unsplash for demo)
INSERT INTO files (id, url, source_type, source_id, prompt, created_at, updated_at) VALUES
-- Nature scenes (generated)
('20000000-0000-4000-a000-000000000001', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', 'generated', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'A majestic mountain landscape at sunset with dramatic clouds', NOW(), NOW()),
('20000000-0000-4000-a000-000000000002', 'https://images.unsplash.com/photo-1511497584788-876760111969', 'generated', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'A mystical forest path with rays of light filtering through trees', NOW(), NOW()),
('20000000-0000-4000-a000-000000000003', 'https://images.unsplash.com/photo-1491002052546-bf38f186af56', 'generated', 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'A serene winter landscape with snow-covered pine trees', NOW(), NOW()),
-- Urban scenes (generated)
('20000000-0000-4000-a000-000000000004', 'https://images.unsplash.com/photo-1519501025264-65ba15a82390', 'generated', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'A futuristic city at night with neon lights and tall buildings', NOW(), NOW()),
('20000000-0000-4000-a000-000000000005', 'https://images.unsplash.com/photo-1534430480872-3498386e7856', 'generated', 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'A cozy European street with cafes and cobblestones', NOW(), NOW()),
('20000000-0000-4000-a000-000000000006', 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000', 'generated', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'A modern city skyline during golden hour', NOW(), NOW()),
-- Animals (generated)
('20000000-0000-4000-a000-000000000007', 'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60', 'generated', 'c3d4e5f6-a7b8-4c9d-0e1f-2a3b4c5d6e7f', 'A majestic lion portrait with detailed fur and intense eyes', NOW(), NOW()),
('20000000-0000-4000-a000-000000000008', 'https://images.unsplash.com/photo-1558788353-f76d92427f16', 'generated', 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', 'A golden retriever running through a field of flowers', NOW(), NOW()),
-- Portraits (generated)
('20000000-0000-4000-a000-000000000009', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80', 'generated', 'd4e5f6a7-b8c9-4d0e-1f2a-3b4c5d6e7f8a', 'A professional portrait of a woman with natural lighting', NOW(), NOW()),
('20000000-0000-4000-a000-000000000010', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e', 'generated', 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', 'A portrait of a man in casual attire with soft lighting', NOW(), NOW());

-- Insert Games (one per day)
INSERT INTO games (id, date, created_at, updated_at) VALUES
('30000000-0000-4000-a000-000000000001', CURRENT_DATE, NOW(), NOW()),
('30000000-0000-4000-a000-000000000002', CURRENT_DATE + INTERVAL '1 day', NOW(), NOW()),
('30000000-0000-4000-a000-000000000003', CURRENT_DATE + INTERVAL '2 days', NOW(), NOW()),
('30000000-0000-4000-a000-000000000004', CURRENT_DATE + INTERVAL '3 days', NOW(), NOW()),
('30000000-0000-4000-a000-000000000005', CURRENT_DATE + INTERVAL '4 days', NOW(), NOW());

-- Insert File Pairs for Game 1 (Dec 4) - Nature theme
INSERT INTO file_pairs (id, real_file_id, generated_file_id, real_vote_count, generated_vote_count, game_id, created_at, updated_at) VALUES
('40000000-0000-4000-a000-000000000001', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000001', 145, 89, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('40000000-0000-4000-a000-000000000002', '10000000-0000-4000-a000-000000000002', '20000000-0000-4000-a000-000000000002', 112, 134, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('40000000-0000-4000-a000-000000000003', '10000000-0000-4000-a000-000000000003', '20000000-0000-4000-a000-000000000003', 98, 156, '30000000-0000-4000-a000-000000000001', NOW(), NOW());

-- Insert File Pairs for Game 2 (Dec 5) - Urban theme
INSERT INTO file_pairs (id, real_file_id, generated_file_id, real_vote_count, generated_vote_count, game_id, created_at, updated_at) VALUES
('40000000-0000-4000-a000-000000000004', '10000000-0000-4000-a000-000000000004', '20000000-0000-4000-a000-000000000004', 0, 0, '30000000-0000-4000-a000-000000000002', NOW(), NOW()),
('40000000-0000-4000-a000-000000000005', '10000000-0000-4000-a000-000000000005', '20000000-0000-4000-a000-000000000005', 0, 0, '30000000-0000-4000-a000-000000000002', NOW(), NOW()),
('40000000-0000-4000-a000-000000000006', '10000000-0000-4000-a000-000000000006', '20000000-0000-4000-a000-000000000006', 0, 0, '30000000-0000-4000-a000-000000000002', NOW(), NOW());

-- Insert File Pairs for Game 3 (Dec 6) - Animal theme
INSERT INTO file_pairs (id, real_file_id, generated_file_id, real_vote_count, generated_vote_count, game_id, created_at, updated_at) VALUES
('40000000-0000-4000-a000-000000000007', '10000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000007', 0, 0, '30000000-0000-4000-a000-000000000003', NOW(), NOW()),
('40000000-0000-4000-a000-000000000008', '10000000-0000-4000-a000-000000000008', '20000000-0000-4000-a000-000000000008', 0, 0, '30000000-0000-4000-a000-000000000003', NOW(), NOW());

-- Insert File Pairs for Game 4 (Dec 7) - Portrait theme
INSERT INTO file_pairs (id, real_file_id, generated_file_id, real_vote_count, generated_vote_count, game_id, created_at, updated_at) VALUES
('40000000-0000-4000-a000-000000000009', '10000000-0000-4000-a000-000000000009', '20000000-0000-4000-a000-000000000009', 0, 0, '30000000-0000-4000-a000-000000000004', NOW(), NOW()),
('40000000-0000-4000-a000-000000000010', '10000000-0000-4000-a000-000000000010', '20000000-0000-4000-a000-000000000010', 0, 0, '30000000-0000-4000-a000-000000000004', NOW(), NOW());

-- Insert File Pairs for Game 5 (Dec 8) - Mixed theme
INSERT INTO file_pairs (id, real_file_id, generated_file_id, real_vote_count, generated_vote_count, game_id, created_at, updated_at) VALUES
('40000000-0000-4000-a000-000000000011', '10000000-0000-4000-a000-000000000001', '20000000-0000-4000-a000-000000000004', 0, 0, '30000000-0000-4000-a000-000000000005', NOW(), NOW()),
('40000000-0000-4000-a000-000000000012', '10000000-0000-4000-a000-000000000007', '20000000-0000-4000-a000-000000000009', 0, 0, '30000000-0000-4000-a000-000000000005', NOW(), NOW());

-- Insert sample Game Results (for past game)
INSERT INTO game_results (id, points_scored, accuracy, game_id, created_at, updated_at) VALUES
('50000000-0000-4000-a000-000000000001', 2450, 2, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('50000000-0000-4000-a000-000000000002', 3000, 3, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('50000000-0000-4000-a000-000000000003', 1200, 1, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('50000000-0000-4000-a000-000000000004', 2100, 2, '30000000-0000-4000-a000-000000000001', NOW(), NOW()),
('50000000-0000-4000-a000-000000000005', 2850, 3, '30000000-0000-4000-a000-000000000001', NOW(), NOW());

-- Verify the data
SELECT 'Models:' as table_name, COUNT(*) as count FROM models
UNION ALL
SELECT 'Files:', COUNT(*) FROM files
UNION ALL
SELECT 'Games:', COUNT(*) FROM games
UNION ALL
SELECT 'File Pairs:', COUNT(*) FROM file_pairs
UNION ALL
SELECT 'Game Results:', COUNT(*) FROM game_results;

-- Display sample game with details
SELECT 
    g.id as game_id,
    g.date,
    COUNT(DISTINCT fp.id) as file_pair_count,
    COUNT(DISTINCT gr.id) as result_count
FROM games g
LEFT JOIN file_pairs fp ON g.id = fp.game_id
LEFT JOIN game_results gr ON g.id = gr.game_id
GROUP BY g.id, g.date
ORDER BY g.date;


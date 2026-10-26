-- Local demo logs for Hifzur Rahman. Safe to re-run (INSERT OR IGNORE).
-- Student: 8c3d6487-73b2-462b-8c86-408936812255

INSERT OR IGNORE INTO sessions (id, student_id, subject, topic, type, score, confidence, note, created_at) VALUES
('a1000000-0000-4000-8000-000000000001', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Practice', NULL, 'struggled', 'Signs went missing when expanding brackets.', '2026-06-12T17:20:00.000Z'),
('a1000000-0000-4000-8000-000000000002', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Homework', '11/20', 'okay', NULL, '2026-06-26T18:05:00.000Z'),
('a1000000-0000-4000-8000-000000000003', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Practice', NULL, 'okay', NULL, '2026-07-09T16:40:00.000Z'),
('a1000000-0000-4000-8000-000000000004', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Homework', '16/20', 'confident', NULL, '2026-08-14T19:10:00.000Z'),
('a1000000-0000-4000-8000-000000000005', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Practice', '18/20', 'confident', 'Factorising is quicker now.', '2026-09-11T17:55:00.000Z'),

('a1000000-0000-4000-8000-000000000006', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Practice', '8/20', 'struggled', NULL, '2026-06-18T18:30:00.000Z'),
('a1000000-0000-4000-8000-000000000007', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Homework', '12/20', 'okay', NULL, '2026-07-02T17:15:00.000Z'),
('a1000000-0000-4000-8000-000000000008', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Practice', '14/20', 'okay', 'Completing the square still slow.', '2026-07-23T16:50:00.000Z'),
('a1000000-0000-4000-8000-000000000009', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Assignment', '17/20', 'confident', NULL, '2026-08-20T18:45:00.000Z'),
('a1000000-0000-4000-8000-00000000000a', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Practice', '18/20', 'confident', NULL, '2026-09-24T17:05:00.000Z'),

('a1000000-0000-4000-8000-00000000000b', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Differentiation', 'Practice', NULL, 'okay', NULL, '2026-07-16T19:00:00.000Z'),
('a1000000-0000-4000-8000-00000000000c', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Differentiation', 'Homework', '13/25', 'okay', NULL, '2026-08-06T18:20:00.000Z'),
('a1000000-0000-4000-8000-00000000000d', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Differentiation', 'Practice', '19/25', 'confident', NULL, '2026-08-27T16:35:00.000Z'),
('a1000000-0000-4000-8000-00000000000e', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Differentiation', 'Homework', '16/25', 'okay', 'Chain rule dropped a mark.', '2026-09-17T18:10:00.000Z'),
('a1000000-0000-4000-8000-00000000000f', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Differentiation', 'Practice', NULL, 'confident', NULL, '2026-09-30T17:40:00.000Z'),

('a1000000-0000-4000-8000-000000000010', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Integration', 'Practice', '9/20', 'struggled', NULL, '2026-06-30T18:00:00.000Z'),
('a1000000-0000-4000-8000-000000000011', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Integration', 'Homework', '12/20', 'okay', NULL, '2026-07-21T17:25:00.000Z'),
('a1000000-0000-4000-8000-000000000012', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Integration', 'Practice', NULL, 'okay', NULL, '2026-08-11T16:15:00.000Z'),

('a1000000-0000-4000-8000-000000000013', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Proof', 'Practice', NULL, 'struggled', 'Not sure when a counter-example is enough.', '2026-07-07T19:20:00.000Z'),
('a1000000-0000-4000-8000-000000000014', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Proof', 'Homework', NULL, NULL, 'Finished the sheet but did not mark it.', '2026-07-28T18:00:00.000Z'),

('a1000000-0000-4000-8000-000000000015', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'SUVAT', 'Practice', '10/16', 'okay', NULL, '2026-06-15T16:10:00.000Z'),
('a1000000-0000-4000-8000-000000000016', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'SUVAT', 'Homework', '13/16', 'confident', NULL, '2026-07-01T17:45:00.000Z'),
('a1000000-0000-4000-8000-000000000017', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'SUVAT', 'Practice', '14/16', 'confident', NULL, '2026-08-03T18:30:00.000Z'),
('a1000000-0000-4000-8000-000000000018', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'SUVAT', 'Homework', NULL, NULL, NULL, '2026-09-04T16:55:00.000Z'),

('a1000000-0000-4000-8000-000000000019', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Practice', NULL, 'struggled', 'Resolving on a slope is messy.', '2026-06-22T17:35:00.000Z'),
('a1000000-0000-4000-8000-00000000001a', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Homework', '14/24', 'okay', NULL, '2026-07-13T18:50:00.000Z'),
('a1000000-0000-4000-8000-00000000001b', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Practice', '18/24', 'okay', NULL, '2026-08-10T17:05:00.000Z'),
('a1000000-0000-4000-8000-00000000001c', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Assignment', '21/24', 'confident', NULL, '2026-09-08T19:15:00.000Z'),
('a1000000-0000-4000-8000-00000000001d', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Practice', NULL, 'confident', NULL, '2026-09-29T16:25:00.000Z'),

('a1000000-0000-4000-8000-00000000001e', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Moments', 'Practice', '6/12', 'struggled', NULL, '2026-07-06T18:40:00.000Z'),
('a1000000-0000-4000-8000-00000000001f', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Moments', 'Homework', '8/12', 'okay', NULL, '2026-07-27T17:20:00.000Z'),
('a1000000-0000-4000-8000-000000000020', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Moments', 'Practice', '10/12', 'confident', 'Take moments about the hinge.', '2026-09-01T18:00:00.000Z'),

('a1000000-0000-4000-8000-000000000021', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Waves', 'Practice', NULL, 'okay', NULL, '2026-06-29T16:45:00.000Z'),
('a1000000-0000-4000-8000-000000000022', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Waves', 'Homework', '11/20', 'okay', NULL, '2026-07-20T19:05:00.000Z'),

('a1000000-0000-4000-8000-000000000023', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Bonding', 'Practice', NULL, 'okay', NULL, '2026-06-16T17:50:00.000Z'),
('a1000000-0000-4000-8000-000000000024', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Bonding', 'Homework', '15/20', 'confident', NULL, '2026-07-08T18:15:00.000Z'),
('a1000000-0000-4000-8000-000000000025', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Bonding', 'Practice', NULL, 'confident', NULL, '2026-08-18T16:30:00.000Z'),

('a1000000-0000-4000-8000-000000000026', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Amount of substance', 'Practice', '9/16', 'struggled', 'Moles and gas volume mixed up.', '2026-06-24T19:25:00.000Z'),
('a1000000-0000-4000-8000-000000000027', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Amount of substance', 'Homework', '11/16', 'okay', NULL, '2026-07-15T17:10:00.000Z'),
('a1000000-0000-4000-8000-000000000028', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Amount of substance', 'Practice', '13/16', 'okay', NULL, '2026-08-12T18:35:00.000Z'),
('a1000000-0000-4000-8000-000000000029', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Amount of substance', 'Homework', '14/16', 'confident', NULL, '2026-09-15T16:20:00.000Z'),
('a1000000-0000-4000-8000-00000000002a', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Amount of substance', 'Practice', NULL, 'confident', NULL, '2026-10-01T17:50:00.000Z'),

('a1000000-0000-4000-8000-00000000002b', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Equilibria', 'Practice', '7/15', 'struggled', NULL, '2026-08-25T18:55:00.000Z'),
('a1000000-0000-4000-8000-00000000002c', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Algebra', 'Homework', NULL, NULL, 'Marked later — left unmeasured on purpose.', '2026-09-03T17:00:00.000Z'),
('a1000000-0000-4000-8000-00000000002d', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Forces', 'Homework', NULL, NULL, NULL, '2026-09-22T18:20:00.000Z'),
('a1000000-0000-4000-8000-00000000002e', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Quadratics', 'Practice', NULL, NULL, NULL, '2026-10-01T16:05:00.000Z');

INSERT OR IGNORE INTO tests (id, student_id, subject, track, title, type, score, confidence, note, created_at) VALUES
('b1000000-0000-4000-8000-000000000001', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Pure Paper 1', 'June mock', 'Test', '38/100', NULL, 'Ran out of time on the last two questions.', '2026-06-20T14:00:00.000Z'),
('b1000000-0000-4000-8000-000000000002', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Pure Paper 1', 'July topic test', 'Test', '51/100', NULL, NULL, '2026-07-18T14:00:00.000Z'),
('b1000000-0000-4000-8000-000000000003', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Pure Paper 1', 'September mock', 'Test', '64/100', NULL, 'Differentiation section was cleaner.', '2026-09-12T13:30:00.000Z'),
('b1000000-0000-4000-8000-000000000004', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Pure Paper 1', 'October mini', 'Test', '71/100', NULL, NULL, '2026-09-26T15:00:00.000Z'),

('b1000000-0000-4000-8000-000000000005', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Stats Paper', 'Chapter test', 'Test', '22/40', NULL, NULL, '2026-07-04T14:30:00.000Z'),
('b1000000-0000-4000-8000-000000000006', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Stats Paper', 'August paper', 'Test', '28/40', NULL, NULL, '2026-08-08T13:45:00.000Z'),
('b1000000-0000-4000-8000-000000000007', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Stats Paper', 'September paper', 'Test', '25/40', NULL, 'Hypothesis tests still leak marks.', '2026-09-19T14:10:00.000Z'),

('b1000000-0000-4000-8000-000000000008', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Paper 1', 'June mock', 'Test', '42/80', NULL, NULL, '2026-06-27T13:00:00.000Z'),
('b1000000-0000-4000-8000-000000000009', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Paper 1', 'July end of topic', 'Test', '48/80', NULL, NULL, '2026-07-25T14:20:00.000Z'),
('b1000000-0000-4000-8000-00000000000a', '8c3d6487-73b2-462b-8c86-408936812255', 'Physics', 'Paper 1', 'September mock', 'Test', '55/80', NULL, 'Forces questions held up.', '2026-09-13T13:15:00.000Z'),

('b1000000-0000-4000-8000-00000000000b', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Paper 1', 'June quiz', 'Test', '18/40', NULL, NULL, '2026-06-25T15:40:00.000Z'),
('b1000000-0000-4000-8000-00000000000c', '8c3d6487-73b2-462b-8c86-408936812255', 'Chemistry', 'Paper 1', 'September mock', 'Test', '27/40', NULL, NULL, '2026-09-10T14:50:00.000Z'),
('b1000000-0000-4000-8000-00000000000d', '8c3d6487-73b2-462b-8c86-408936812255', 'Maths', 'Pure Paper 1', 'Marking pass', 'Marking', '68/100', NULL, 'Re-marked the June mock after corrections.', '2026-08-01T16:00:00.000Z');

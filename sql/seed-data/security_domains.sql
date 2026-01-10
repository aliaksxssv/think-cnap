INSERT INTO security_domains (id, name) VALUES (1, 'Security Foundations') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (2, 'Identity & Access Management') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (3, 'Detection') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (4, 'Infrastructure Protection') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (5, 'Data Protection') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (6, 'Incident Response') ON CONFLICT (id) DO NOTHING;
INSERT INTO security_domains (id, name) VALUES (7, 'Application Security') ON CONFLICT (id) DO NOTHING;

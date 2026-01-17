-- Default admin user (email: admin@thinkcnap.local, password: thinkcnap)
INSERT INTO users (email, password_hash, name, is_admin, created_at, updated_at)
VALUES (
  'admin@thinkcnap.local',
  'ebf6ee48748ed047906e9d8b011a28e04cec8866aabfd9d23ce4bbb341422822',
  'admin',
  TRUE,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  is_admin = TRUE,
  updated_at = CURRENT_TIMESTAMP;

-- Default admin user (email: admin, password: thinkcnap)
INSERT INTO users (email, password_hash, name, is_admin, email_verified, email_verified_at, created_at, updated_at)
VALUES (
  'admin',
  'ebf6ee48748ed047906e9d8b011a28e04cec8866aabfd9d23ce4bbb341422822',
  'admin',
  TRUE,
  1,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE
SET
  password_hash = EXCLUDED.password_hash,
  name = EXCLUDED.name,
  is_admin = TRUE,
  email_verified = 1,
  email_verified_at = CURRENT_TIMESTAMP,
  updated_at = CURRENT_TIMESTAMP;

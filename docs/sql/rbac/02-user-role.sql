-- ============================================================
-- WealthWise RBAC
-- User Role Verification
-- ============================================================
--
-- Purpose:
-- Verify which role is assigned to a specific user.
--
-- ============================================================

SELECT
  u.email,
  u.status,
  r.name AS role
FROM users u
JOIN user_roles ur
  ON ur.user_id = u.id
JOIN roles r
  ON r.id = ur.role_id
WHERE u.email = 'admin@wealthwise.local';
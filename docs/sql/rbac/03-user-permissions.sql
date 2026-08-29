-- ============================================================
-- WealthWise RBAC
-- User Permission Verification
-- ============================================================
--
-- Purpose:
-- Display all permissions available to a user through
-- their assigned roles.
--
-- Permission flow:
--
-- User
--   ↓
-- UserRole
--   ↓
-- Role
--   ↓
-- RolePermission
--   ↓
-- Permission
--
-- ============================================================

SELECT
  r.name AS role,
  p.resource,
  p.action
FROM users u
JOIN user_roles ur
  ON ur.user_id = u.id
JOIN roles r
  ON r.id = ur.role_id
JOIN role_permissions rp
  ON rp.role_id = r.id
JOIN permissions p
  ON p.id = rp.permission_id
WHERE u.email = 'admin@wealthwise.local'
ORDER BY p.resource, p.action;
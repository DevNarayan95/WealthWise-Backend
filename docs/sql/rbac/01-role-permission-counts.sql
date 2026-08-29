-- ============================================================
-- WealthWise RBAC
-- Role Permission Counts
-- ============================================================
--
-- Purpose:
-- Verify how many permissions are assigned to each role.
--
-- Expected seeded roles:
--   SUPER_ADMIN
--   ADMIN
--   ACCOUNT_MANAGER
--   CUSTOMER
--
-- Expected permission counts:
--   SUPER_ADMIN    -> 18
--   ADMIN          -> 8
--   ACCOUNT_MANAGER -> 4
--   CUSTOMER       -> 3
--
-- ============================================================

SELECT
  r.name AS role,
  COUNT(rp.permission_id) AS permission_count
FROM roles r
LEFT JOIN role_permissions rp
  ON rp.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.name;
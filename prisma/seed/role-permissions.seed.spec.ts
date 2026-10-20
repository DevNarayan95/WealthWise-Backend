import { rolePermissions } from './role-permissions.seed';

describe('rolePermissions', () => {
  it('grants CUSTOMER account create and read permissions', () => {
    expect(rolePermissions.CUSTOMER).toEqual(
      expect.arrayContaining(['accounts:create', 'accounts:read']),
    );
  });

  it('does not grant CUSTOMER account update permission', () => {
    expect(rolePermissions.CUSTOMER).not.toContain('accounts:update');
  });

  it('grants CUSTOMER the income permissions', () => {
    expect(rolePermissions.CUSTOMER).toEqual(
      expect.arrayContaining(['income:create', 'income:read', 'income:update']),
    );
  });

  it('grants ACCOUNT_MANAGER account create permission', () => {
    expect(rolePermissions.ACCOUNT_MANAGER).toContain('accounts:create');
  });
});

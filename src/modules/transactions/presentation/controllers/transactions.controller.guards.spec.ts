import { TransactionsController } from './transactions.controller';
import { JwtAuthGuard } from '../../../auth/infrastructure/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../../auth/infrastructure/guards/permissions.guard';
import { PERMISSIONS_KEY } from '../../../auth/infrastructure/decorators/permissions.decorator';

// Nest stores @UseGuards() metadata under this key (GUARDS_METADATA).
const GUARDS_METADATA_KEY = '__guards__';

describe('TransactionsController route protection', () => {
  const protectedRoutes: Array<[string, string]> = [
    ['create', 'transactions:create'],
    ['findById', 'transactions:read'],
    ['findAll', 'transactions:read'],
    ['reverse', 'transactions:update'],
  ];

  it.each(protectedRoutes)(
    'should require JWT and permission guards on %s',
    (methodName, permission) => {
      const handler = TransactionsController.prototype[
        methodName as keyof TransactionsController
      ] as object;

      expect(Reflect.getMetadata(GUARDS_METADATA_KEY, handler)).toEqual([
        JwtAuthGuard,
        PermissionsGuard,
      ]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual([
        permission,
      ]);
    },
  );
});

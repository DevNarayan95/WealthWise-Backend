export interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  /** When true the account is created already verified (for admin-provisioned users). */
  emailVerified?: boolean;
}

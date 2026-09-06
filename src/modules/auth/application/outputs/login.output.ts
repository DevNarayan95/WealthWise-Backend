import { User } from '../../../users/domain/entities/user.entity';

export interface LoginOutput {
  user: User;
  accessToken: string;
}

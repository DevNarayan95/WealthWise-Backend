import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from '../../presentation/dto/login.dto';
import { UserRepository } from '../../../users/domain/repositories/user.repository';
import { PasswordHasherService } from '../../../../infrastructure/security/password-hasher.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepository.findByEmail(dto.email);

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const passwordValid = await this.passwordHasher.verify(
      dto.password,
      user.passwordHash,
    );

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
    });

    return {
      user,
      accessToken,
    };
  }
}

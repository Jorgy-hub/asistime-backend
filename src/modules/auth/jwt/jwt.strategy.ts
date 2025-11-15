import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/services/user.service';
import { User } from '../../user/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'jorgypzk',
    });
  }

  async validate(payload: any): Promise<User | null> {
    const user = await this.userService.findOne(payload.username);
    this.logger.log(`Validating user: ${payload.username}`);
    if (!user) {
      return null;
    }
    this.logger.log(`User ${payload.username} validated successfully`);
    return user;
  }
}
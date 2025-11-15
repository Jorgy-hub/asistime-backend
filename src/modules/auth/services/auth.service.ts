import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../../user/services/user.service';
import * as bcrypt from 'bcryptjs';
import { UserAuthDto, UpdateUserDto } from 'src/modules/user/dtos/user.dto';
import { Student } from 'src/modules/students/schemas/student.schema';
import { User } from 'src/modules/user/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.userService.findOne(username);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _, ...result } = user.toObject();
    return result;
  }

  async login(user: any): Promise<{ access_token: string }> {
    const payload = { username: user.username, sub: user._id };
    return {
      access_token: this.jwtService.sign(payload),
    };
  }

  async update(body: UpdateUserDto): Promise<any> {
    const user = await this.userService.findOne(body.username);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (body.password) {
      body.password = await bcrypt.hash(body.password, 10);
    } else {
      delete body.password;
    }

    Object.assign(user, body);
    await user.save();
    const { password: _, ...result } = user.toObject();
    return result;
  }

  async delete(username: string): Promise<any> {
    const user = await this.userService.findOne(username);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    await this.userService.delete(username);
    return { message: `User ${username} deleted successfully` };
  }

  async register(body: UserAuthDto):Promise<User> {
    const hashedPassword = await bcrypt.hash(body.password, 10);
    return this.userService.register(body.username, hashedPassword, body.admin, body.permissions);
  }
}
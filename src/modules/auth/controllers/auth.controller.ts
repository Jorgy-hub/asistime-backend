import { Controller, Post, Body, UseGuards, Get, Request, Logger } from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../jwt/jwt-auth.guard';
import { UserAuthDto, UpdateUserDto } from '../../user/dtos/user.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { User } from '../../user/schemas/user.schema';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() userAuthDto: UserAuthDto): Promise<User> {
    return this.authService.register(userAuthDto);
  }

  @Post('login')
  async login(@Body() loginDto: UserAuthDto): Promise<{ access_token: string }> {
    this.logger.log(`Attempting login for user: ${loginDto.username}`); 
    const user = await this.authService.validateUser(loginDto.username, loginDto.password);
    return this.authService.login(user);
  }

  @Post('update')
  async update(@Body() updateDto: UpdateUserDto): Promise<any> {
    this.logger.log(`Update endpoint called with data: ${JSON.stringify(updateDto)}`); 
    return this.authService.update(updateDto);
  }

  @Post('delete')
  async delete(@Body() deleteDto: { username: string }): Promise<any> {
    this.logger.log(`Delete endpoint called for user: ${deleteDto.username}`); 
    return this.authService.delete(deleteDto.username);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req): Promise<User> {
    this.logger.log(`Fetching profile for user: ${req.user.username}`); 
    return req.user;
  }
}
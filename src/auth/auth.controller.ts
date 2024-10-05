import {
  Body,
  Controller,
  Get,
  Ip,
  Post,
  Req,
  UseGuards
} from '@nestjs/common';
import { AuthService } from './service/auth.service';
import { AuthDto } from './dto/AuthDto';
import { SignUpDto } from './dto/SignUpDto';
import { ActivationDto } from './dto/ActivationDto';
import { ResetPasswordDto } from './dto/ResetPasswordDto';
import { JwtUser } from './decorators/jwt-user.decorator';
import { JwtPayload } from './dto/JwtPayload';
import { RefreshTokenGuard } from './guard/refresh-token.guard';
import { AccessTokenGuard } from './guard/access-token.guard';

@Controller('/api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post()
  async signin(@Body() data: AuthDto, @Ip() ip: any) {
    console.log(ip);
    return this.authService.signIn(data, ip);
  }

  @Post('signup')
  async signup(@Body() createUserDto: SignUpDto) {
    return this.authService.signUp(createUserDto);
  }

  @Post('/request-token')
  async requestToken(@Body() authRequest: ResetPasswordDto) {
    return this.authService.resetPassword(authRequest.username);
  }

  @Post('/verify-token')
  async verifyToken(@Body() authRequest: ActivationDto) {
    return this.authService.verifyToken(authRequest);
  }

  @Get('refresh')
  @UseGuards(RefreshTokenGuard)
  refreshTokens(@JwtUser() payload: JwtPayload) {
    return this.authService.refreshTokens(payload.sub, payload.refreshToken);
  }

  @Get('logout')
  @UseGuards(AccessTokenGuard)
  async logout(@JwtUser('sub') id: number) {
    return this.authService.logout(id);
  }
}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PasswordService } from './password.service';
import { AccessStrategy } from './strategies/access.strategy';
import { RefreshStrategy } from './strategies/refresh.strategy';
import { ScopeService } from './scope.service';
import { ScopeGuard } from './guards/scope.guard';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PassportModule, JwtModule.register({}), UsersModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    AccessStrategy,
    RefreshStrategy,
    ScopeService,
    ScopeGuard,
  ],
  exports: [AuthService, ScopeService, ScopeGuard],
})
export class AuthModule {}

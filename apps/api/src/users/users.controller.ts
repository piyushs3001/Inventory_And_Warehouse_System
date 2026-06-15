import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignWarehousesDto } from './dto/assign-warehouses.dto';
import { UserDto } from './dto/user.dto';
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ApiAuthErrors,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiAuthErrors()
@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a user' })
  @ApiCreatedResponse({ type: UserDto })
  @ApiValidationError()
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Email already in use.',
  })
  create(@Body() dto: CreateUserDto) {
    return this.users.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all users' })
  @ApiOkResponse({ type: UserDto, isArray: true })
  findAll() {
    return this.users.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a user by id' })
  @ApiParam({ name: 'id', description: 'User id (UUID).' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'User not found.',
  })
  findOne(@Param('id') id: string) {
    return this.users.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User id (UUID).' })
  @ApiOkResponse({ type: UserDto })
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'User not found.',
  })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.users.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Deactivate a user',
    description: 'Soft-deactivates the user (status → INACTIVE).',
  })
  @ApiParam({ name: 'id', description: 'User id (UUID).' })
  @ApiOkResponse({ type: UserDto })
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'User not found.',
  })
  deactivate(@Param('id') id: string) {
    return this.users.deactivate(id);
  }

  @Put(':id/warehouses')
  @ApiOperation({
    summary: "Set a user's warehouse scope",
    description: 'Replaces the full set of warehouses assigned to the user.',
  })
  @ApiParam({ name: 'id', description: 'User id (UUID).' })
  @ApiOkResponse({ type: UserDto })
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'User not found.',
  })
  setWarehouses(@Param('id') id: string, @Body() dto: AssignWarehousesDto) {
    return this.users.setWarehouses(id, dto.warehouseIds);
  }
}

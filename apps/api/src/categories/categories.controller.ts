import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { JwtAccessGuard } from '../auth/guards/jwt-access.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryDto } from './dto/category.dto';
import {
  ApiAuthErrors,
  ApiUnauthorizedTokenError,
  ApiValidationError,
} from '../common/decorators/api-errors.decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('categories')
@ApiBearerAuth('access-token')
@Controller('categories')
@UseGuards(JwtAccessGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List categories',
    description:
      'Global catalog reference data; available to any authenticated user.',
  })
  @ApiOkResponse({ type: CategoryDto, isArray: true })
  @ApiUnauthorizedTokenError()
  list(): Promise<CategoryDto[]> {
    return this.categories.list();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a category by id' })
  @ApiParam({ name: 'id', description: 'Category id (UUID).' })
  @ApiOkResponse({ type: CategoryDto })
  @ApiUnauthorizedTokenError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Category not found.',
  })
  findOne(@Param('id') id: string): Promise<CategoryDto> {
    return this.categories.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Create a category' })
  @ApiCreatedResponse({ type: CategoryDto })
  @ApiAuthErrors()
  @ApiValidationError()
  create(@Body() dto: CreateCategoryDto): Promise<CategoryDto> {
    return this.categories.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({ summary: 'Update a category (rename or re-parent)' })
  @ApiParam({ name: 'id', description: 'Category id (UUID).' })
  @ApiOkResponse({ type: CategoryDto })
  @ApiAuthErrors()
  @ApiValidationError()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Category not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Re-parenting would create a cycle.',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ): Promise<CategoryDto> {
    return this.categories.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.WAREHOUSE_MANAGER)
  @ApiOperation({
    summary: 'Delete a category',
    description:
      'Hard-deletes a category with no child categories; otherwise 409 (restrict-on-dependency).',
  })
  @ApiParam({ name: 'id', description: 'Category id (UUID).' })
  @ApiOkResponse({ type: CategoryDto })
  @ApiAuthErrors()
  @ApiNotFoundResponse({
    type: ErrorResponseDto,
    description: 'Category not found.',
  })
  @ApiConflictResponse({
    type: ErrorResponseDto,
    description: 'Category has child categories.',
  })
  remove(@Param('id') id: string): Promise<CategoryDto> {
    return this.categories.remove(id);
  }
}

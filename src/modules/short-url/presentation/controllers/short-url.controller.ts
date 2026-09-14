import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ServiceResponse } from '../../../../shared/responses/service-response';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../guards/optional-jwt.guard';
import { OptionalUserId } from '../decorators/optional-user.decorator';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user-id.decorator';
import { CreateShortUrlDTO } from '../dtos/create-short-url.dto';
import { GetShortUrlWithPasswordDTO } from '../dtos/get-short-url.dto';
import { UpdateUrlDTO } from '../dtos/update-url.dto';
import { UpdateUrlActiveDTO } from '../dtos/update-url-active.dto';
import { DeleteIdsDTO } from '../dtos/delete-ids.dto';
import { PaginationDTO } from '../dtos/pagination.dto';
import { CreateShortUrlUseCase } from '../../application/use-cases/create-short-url.usecase';
import { GetShortUrlWithPasswordUseCase } from '../../application/use-cases/get-short-url-with-password.usecase';
import { GetShortUrlRedirectUseCase } from '../../application/use-cases/get-short-url-redirect.usecase';
import { UpdateUrlUseCase } from '../../application/use-cases/update-url.usecase';
import { UpdateUrlActiveUseCase } from '../../application/use-cases/update-url-active.usecase';
import { DeleteUrlsUseCase } from '../../application/use-cases/delete-urls.usecase';
import { GetMyUrlsUseCase } from '../../application/use-cases/get-my-urls.usecase';

@ApiTags('Short URL')
@Controller()
export class ShortUrlController {
  constructor(
    private readonly createShortUrlUseCase: CreateShortUrlUseCase,
    private readonly getShortUrlWithPasswordUseCase: GetShortUrlWithPasswordUseCase,
    private readonly getShortUrlRedirectUseCase: GetShortUrlRedirectUseCase,
    private readonly updateUrlUseCase: UpdateUrlUseCase,
    private readonly updateUrlActiveUseCase: UpdateUrlActiveUseCase,
    private readonly deleteUrlsUseCase: DeleteUrlsUseCase,
    private readonly getMyUrlsUseCase: GetMyUrlsUseCase,
  ) { }

  @Post()
  @Throttle({ create: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({
    summary: 'Create a new short URL',
    description: 'Create a short URL. Max 10 per minute per IP. Can be used anonymously, or while authenticated to associate the URL with your account',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Short URL created successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Alias already exists' })
  @ApiResponse({ status: HttpStatus.TOO_MANY_REQUESTS, description: 'Rate limit exceeded (10 links/min per IP)' })
  async createShortUrl(
    @Body() body: CreateShortUrlDTO,
    @OptionalUserId() userId?: string,
  ) {
    const data = await this.createShortUrlUseCase.execute(body, userId);
    return ServiceResponse.success(
      'Short URL created successfully',
      data,
      HttpStatus.CREATED,
    );
  }

  // ── Get URL with password ────────────────────────────────
  @Post('view/:alias')
  @ApiOperation({ summary: 'Get short URL info (password-protected)' })
  @ApiParam({ name: 'alias', description: 'Short URL alias', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Short URL retrieved' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'Incorrect password' })
  async getShortUrlWithPassword(
    @Param('alias') alias: string,
    @Body() body: GetShortUrlWithPasswordDTO,
  ) {
    const data = await this.getShortUrlWithPasswordUseCase.execute(
      alias,
      body.password || '',
    );
    return ServiceResponse.success('Short URL retrieved', data);
  }

  // ─── My URLs ─────────────────────────────────────────────
  @Delete('my-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Delete multiple short URLs by ID list' })
  @ApiResponse({ status: HttpStatus.OK, description: 'URLs deleted successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid ID list' })
  async deleteUrls(
    @Body() body: DeleteIdsDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.deleteUrlsUseCase.execute(body.ids, userId);
    return ServiceResponse.success('URLs deleted successfully', null);
  }

  @Patch('my-urls/active')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Batch update active status of multiple URLs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'URL active status updated' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  async updateUrlActive(
    @Body() body: UpdateUrlActiveDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.updateUrlActiveUseCase.execute(body.urls, userId);
    return ServiceResponse.success('URL active status updated', null);
  }

  @Get('my-urls')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'List short URLs for the current user (paginated)' })
  @ApiResponse({ status: HttpStatus.OK, description: 'URL list retrieved successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async getMyUrls(
    @Query() query: PaginationDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.getMyUrlsUseCase.execute(query, userId);
    return ServiceResponse.success('URL list retrieved successfully', data);
  }

  // ─── Update URL ───────────────────────────────────────────
  @Patch(':alias')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Update short URL details' })
  @ApiParam({ name: 'alias', description: 'Current alias of the short URL', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Short URL updated successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'New alias already exists' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  async updateUrl(
    @Param('alias') alias: string,
    @Body() body: UpdateUrlDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.updateUrlUseCase.execute(alias, body, userId);
    return ServiceResponse.success('Short URL updated successfully', data);
  }

  // ─── GET /view/:alias ────────────────────────────────────
  // Direct HTTP 302 Redirect:
  //  - Không có password → HTTP 302 redirect thẳng về URL gốc (views +1 qua Redis INCR)
  //  - Có password       → HTTP 302 redirect về {CLIENT_URL}/password/{alias}?alias={alias}
  @Get('view/:alias')
  @ApiOperation({
    summary: 'Access and redirect short URL',
    description:
      'Directly redirects to the target URL (HTTP 302). If the URL is password-protected, redirects to the client password page.',
  })
  @ApiParam({ name: 'alias', description: 'Short URL alias', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect to target URL or password page' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found or inactive' })
  async getShortUrl(
    @Param('alias') alias: string,
    @Res() res: Response,
  ) {
    const { redirectUrl } = await this.getShortUrlRedirectUseCase.execute(alias);
    return res.redirect(HttpStatus.FOUND, redirectUrl);
  }
}

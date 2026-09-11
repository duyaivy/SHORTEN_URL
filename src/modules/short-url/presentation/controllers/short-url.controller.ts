import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
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
import { GetShortUrlUseCase } from '../../application/use-cases/get-short-url.usecase';
import { GetShortUrlSeoUseCase } from '../../application/use-cases/get-short-url-seo.usecase';
import { GetShortUrlWithPasswordUseCase } from '../../application/use-cases/get-short-url-with-password.usecase';
import { UpdateUrlUseCase } from '../../application/use-cases/update-url.usecase';
import { UpdateUrlActiveUseCase } from '../../application/use-cases/update-url-active.usecase';
import { DeleteUrlsUseCase } from '../../application/use-cases/delete-urls.usecase';
import { GetMyUrlsUseCase } from '../../application/use-cases/get-my-urls.usecase';

@ApiTags('Short URL')
@Controller()
export class ShortUrlController {
  constructor(
    private readonly createShortUrlUseCase: CreateShortUrlUseCase,
    private readonly getShortUrlUseCase: GetShortUrlUseCase,
    private readonly getShortUrlSeoUseCase: GetShortUrlSeoUseCase,
    private readonly getShortUrlWithPasswordUseCase: GetShortUrlWithPasswordUseCase,
    private readonly updateUrlUseCase: UpdateUrlUseCase,
    private readonly updateUrlActiveUseCase: UpdateUrlActiveUseCase,
    private readonly deleteUrlsUseCase: DeleteUrlsUseCase,
    private readonly getMyUrlsUseCase: GetMyUrlsUseCase,
  ) { }

  @Post()
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({
    summary: 'Create a new short URL',
    description: 'Create a short URL. Can be used anonymously, or while authenticated to associate the URL with your account',
  })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Short URL created successfully' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid input data' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Alias already exists' })
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

  // ─── Get short URL SEO (must be before :alias catch-all) ──
  @Get('view/resolve/:alias')
  @Header('Content-Type', 'text/html')
  @ApiOperation({
    summary: 'Get SEO metadata HTML for a short URL',
    description: 'Returns HTML containing Open Graph / meta tags for link previews (used when sharing on social media)',
  })
  @ApiParam({ name: 'alias', description: 'Short URL alias', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SEO HTML returned', type: String })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found' })
  async getShortUrlSeo(@Param('alias') alias: string): Promise<string> {
    return this.getShortUrlSeoUseCase.execute(alias);
  }

  // ── Get short URL (redirect / resolve) ───────────────────
  @Get('view/:alias')
  @ApiOperation({
    summary: 'Access a short URL (redirect)',
    description: 'Redirects the user to the original URL associated with the alias',
  })
  @ApiParam({ name: 'alias', description: 'Short URL alias', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirects to the original URL' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'URL is disabled or requires a password' })
  async getShortUrl(
    @Param('alias') alias: string,
    @Res() res: Response,
  ) {
    const data = await this.getShortUrlUseCase.execute(alias);
    res.redirect(data.url);
  }
}

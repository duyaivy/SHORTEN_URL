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
import { isbot } from 'isbot';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
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

  // ─── GET /view/:alias ────────────────────────────────────
  // Tự động nhận diện User-Agent:
  //  - Bot/Crawler → Trả HTML SEO Meta (KHÔNG tăng views)
  //  - Người dùng thật → Trả JSON + tăng views +1
  @Get('view/:alias')
  @ApiOperation({
    summary: 'Access a short URL (bot-aware)',
    description:
      'Detects User-Agent: bots receive SEO HTML meta tags; real users receive JSON with the target URL and views are incremented.',
  })
  @ApiParam({ name: 'alias', description: 'Short URL alias', example: 'my-link' })
  @ApiResponse({ status: HttpStatus.OK, description: 'SEO HTML (for bots) or JSON data (for real users)' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Short URL not found' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: 'URL is disabled or requires a password' })
  async getShortUrl(
    @Param('alias') alias: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';

    // 🤖 Bot / Crawler → Trả HTML SEO Meta, KHÔNG tăng views
    if (isbot(userAgent)) {
      const html = await this.getShortUrlSeoUseCase.execute(alias);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(HttpStatus.OK).send(html);
    }

    // 👤 Người dùng thật → Trả JSON + tăng views +1
    const data = await this.getShortUrlUseCase.execute(alias);
    return res.status(HttpStatus.OK).json({
      statusCode: 200,
      message: 'Lấy URL thành công',
      success: true,
      data,
    });
  }
}

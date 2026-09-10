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
import { Response } from 'express';
import { ServiceResponse } from '../../../../shared/responses/service-response';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user-id.decorator';
import { OptionalJwtGuard } from '../guards/optional-jwt.guard';
import { OptionalUserId } from '../decorators/optional-user.decorator';
import { CreateShortUrlDTO } from '../dtos/create-short-url.dto';
import { GetShortUrlWithPasswordDTO } from '../dtos/get-short-url.dto';
import { UpdateUrlDTO } from '../dtos/update-url.dto';
import { UpdateUrlActiveDTO } from '../dtos/update-url-active.dto';
import { DeleteIdsDTO } from '../dtos/delete-ids.dto';
import { PaginationDTO } from '../dtos/pagination.dto';
import { CreateQrHistoryDTO } from '../dtos/create-qr-history.dto';
import { VerifyRecaptchaDTO } from '../dtos/verify-recaptcha.dto';
import { CreateShortUrlUseCase } from '../../application/use-cases/create-short-url.usecase';
import { GetShortUrlUseCase } from '../../application/use-cases/get-short-url.usecase';
import { GetShortUrlSeoUseCase } from '../../application/use-cases/get-short-url-seo.usecase';
import { GetShortUrlWithPasswordUseCase } from '../../application/use-cases/get-short-url-with-password.usecase';
import { UpdateUrlUseCase } from '../../application/use-cases/update-url.usecase';
import { UpdateUrlActiveUseCase } from '../../application/use-cases/update-url-active.usecase';
import { DeleteUrlsUseCase } from '../../application/use-cases/delete-urls.usecase';
import { GetMyUrlsUseCase } from '../../application/use-cases/get-my-urls.usecase';
import { CreateQrHistoryUseCase } from '../../application/use-cases/create-qr-history.usecase';
import { GetMyQrHistoriesUseCase } from '../../application/use-cases/get-my-qr-histories.usecase';
import { DeleteQrHistoriesUseCase } from '../../application/use-cases/delete-qr-histories.usecase';
import { VerifyRecaptchaUseCase } from '../../application/use-cases/verify-recaptcha.usecase';

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
    private readonly createQrHistoryUseCase: CreateQrHistoryUseCase,
    private readonly getMyQrHistoriesUseCase: GetMyQrHistoriesUseCase,
    private readonly deleteQrHistoriesUseCase: DeleteQrHistoriesUseCase,
    private readonly verifyRecaptchaUseCase: VerifyRecaptchaUseCase,
  ) {}

  // ─── reCaptcha ────────────────────────────────────────────
  @Post('view/recaptcha')
  async verifyRecaptcha(@Body() body: VerifyRecaptchaDTO) {
    const data = await this.verifyRecaptchaUseCase.execute(body.token);
    return ServiceResponse.success('Xác minh reCAPTCHA thành công', data);
  }

  // ─── Create short URL (optional auth) ─────────────────────
  @Post()
  @UseGuards(OptionalJwtGuard)
  @HttpCode(HttpStatus.CREATED)
  async createShortUrl(
    @Body() body: CreateShortUrlDTO,
    @OptionalUserId() userId?: string,
  ) {
    const data = await this.createShortUrlUseCase.execute(body, userId);
    return ServiceResponse.success(
      'Tạo short URL thành công',
      data,
      HttpStatus.CREATED,
    );
  }

  // ─── QR History ───────────────────────────────────────────
  @Post('qr-history')
  @UseGuards(JwtAuthGuard)
  async createQrHistory(
    @Body() body: CreateQrHistoryDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.createQrHistoryUseCase.execute(body.decoded, userId);
    return ServiceResponse.success('Tạo QR history thành công', null);
  }

  @Get('qr-history')
  @UseGuards(JwtAuthGuard)
  async getMyQrHistories(
    @Query() query: PaginationDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.getMyQrHistoriesUseCase.execute(query, userId);
    return ServiceResponse.success('Lấy QR histories thành công', data);
  }

  @Delete('qr-history')
  @UseGuards(JwtAuthGuard)
  async deleteQrHistories(
    @Body() body: DeleteIdsDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.deleteQrHistoriesUseCase.execute(body.ids, userId);
    return ServiceResponse.success('Xóa QR history thành công', null);
  }

  // ─── Get URL with password ────────────────────────────────
  @Post('view/:alias')
  async getShortUrlWithPassword(
    @Param('alias') alias: string,
    @Body() body: GetShortUrlWithPasswordDTO,
  ) {
    const data = await this.getShortUrlWithPasswordUseCase.execute(
      alias,
      body.password || '',
    );
    return ServiceResponse.success('Lấy URL thành công', data);
  }

  // ─── My URLs ──────────────────────────────────────────────
  @Delete('my-urls')
  @UseGuards(JwtAuthGuard)
  async deleteUrls(
    @Body() body: DeleteIdsDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.deleteUrlsUseCase.execute(body.ids, userId);
    return ServiceResponse.success('Xóa URLs thành công', null);
  }

  @Patch('my-urls/active')
  @UseGuards(JwtAuthGuard)
  async updateUrlActive(
    @Body() body: UpdateUrlActiveDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.updateUrlActiveUseCase.execute(body.urls, userId);
    return ServiceResponse.success('Cập nhật trạng thái URL thành công', null);
  }

  @Get('my-urls')
  @UseGuards(JwtAuthGuard)
  async getMyUrls(
    @Query() query: PaginationDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.getMyUrlsUseCase.execute(query, userId);
    return ServiceResponse.success('Lấy danh sách URLs thành công', data);
  }

  // ─── Update URL ───────────────────────────────────────────
  @Patch(':alias')
  @UseGuards(JwtAuthGuard)
  async updateUrl(
    @Param('alias') alias: string,
    @Body() body: UpdateUrlDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.updateUrlUseCase.execute(alias, body, userId);
    return ServiceResponse.success('Cập nhật URL thành công', data);
  }

  // ─── Get short URL SEO (must be before :alias catch-all) ──
  @Get('view/resolve/:alias')
  @Header('Content-Type', 'text/html')
  async getShortUrlSeo(@Param('alias') alias: string): Promise<string> {
    return this.getShortUrlSeoUseCase.execute(alias);
  }

  // ─── Get short URL (redirect / resolve) ───────────────────
  @Get('view/:alias')
  async getShortUrl(
    @Param('alias') alias: string,
    @Res() res: Response,
  ) {
    const data = await this.getShortUrlUseCase.execute(alias);
    res.redirect(data.url);
  }
}

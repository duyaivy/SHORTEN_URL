import { Body, Controller, Delete, Get, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ServiceResponse } from '../../../../shared/responses/service-response';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { CurrentUserId } from '../../../auth/presentation/decorators/current-user-id.decorator';
import { CreateQrHistoryDTO } from '../dtos/create-qr-history.dto';
import { DeleteIdsDTO } from '../dtos/delete-ids.dto';
import { PaginationDTO } from '../dtos/pagination.dto';
import { CreateQrHistoryUseCase } from '../../application/use-cases/create-qr-history.usecase';
import { GetMyQrHistoriesUseCase } from '../../application/use-cases/get-my-qr-histories.usecase';
import { DeleteQrHistoriesUseCase } from '../../application/use-cases/delete-qr-histories.usecase';

@ApiTags('QR History')
@Controller('qr-history')
export class QrHistoryController {
  constructor(
    private readonly createQrHistoryUseCase: CreateQrHistoryUseCase,
    private readonly getMyQrHistoriesUseCase: GetMyQrHistoriesUseCase,
    private readonly deleteQrHistoriesUseCase: DeleteQrHistoriesUseCase,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Create a QR scan history record' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR history record created' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid URL' })
  async createQrHistory(
    @Body() body: CreateQrHistoryDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.createQrHistoryUseCase.execute(body.decoded, userId);
    return ServiceResponse.success('QR history record created', null);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'List QR scan history for the current user' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR history retrieved successfully' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  async getMyQrHistories(
    @Query() query: PaginationDTO,
    @CurrentUserId() userId: string,
  ) {
    const data = await this.getMyQrHistoriesUseCase.execute(query, userId);
    return ServiceResponse.success('QR history retrieved successfully', data);
  }

  @Delete()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiCookieAuth('access-token-cookie')
  @ApiOperation({ summary: 'Delete QR scan history records by ID list' })
  @ApiResponse({ status: HttpStatus.OK, description: 'QR history records deleted' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Authentication required' })
  @ApiResponse({ status: HttpStatus.UNPROCESSABLE_ENTITY, description: 'Invalid ID list' })
  async deleteQrHistories(
    @Body() body: DeleteIdsDTO,
    @CurrentUserId() userId: string,
  ) {
    await this.deleteQrHistoriesUseCase.execute(body.ids, userId);
    return ServiceResponse.success('QR history records deleted', null);
  }
}

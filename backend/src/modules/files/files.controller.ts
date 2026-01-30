import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { FilesService } from './files.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { ApiResponse } from '../../common/interfaces/api-response.interface';

@Controller('api/v1')
@UseGuards(JwtAuthGuard)
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('files/presign')
  async presignUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: PresignRequestDto,
  ): Promise<ApiResponse<PresignResponseDto | PresignBatchResponseDto>> {
    const result = await this.filesService.presignUpload(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      dto,
    );

    return {
      data: result,
      error: null,
    };
  }

  @Post('files/finalize')
  async finalizeUpload(
    @CurrentUser() user: AuthUser,
    @Body() dto: FinalizeRequestDto,
  ): Promise<ApiResponse<FileResponseDto>> {
    const result = await this.filesService.finalizeUpload(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      dto,
    );

    return {
      data: result,
      error: null,
    };
  }

  @Get('projects/:projectId/files')
  async listProjectFiles(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ): Promise<ApiResponse<FileResponseDto[]>> {
    const files = await this.filesService.listProjectFiles(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
    );

    return {
      data: files,
      error: null,
    };
  }
}

import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { FilesService } from './files.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { CompanyFileListItemDto } from './dto/company-file-list-item.dto';
import { RenameFileDto } from './dto/rename-file.dto';
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

  @Get('files')
  async listCompanyFiles(
    @CurrentUser() user: AuthUser,
  ): Promise<ApiResponse<CompanyFileListItemDto[]>> {
    const files = await this.filesService.listCompanyFiles({
      userId: user.userId,
      companyId: user.companyId,
      role: user.role,
    });

    return {
      data: files,
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

  @Get('files/:fileObjectId/download-url')
  async getFileDownloadUrl(
    @CurrentUser() user: AuthUser,
    @Param('fileObjectId') fileObjectId: string,
  ): Promise<ApiResponse<{ download_url: string }>> {
    const downloadUrl = await this.filesService.getDownloadUrl(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      fileObjectId,
    );

    return {
      data: { download_url: downloadUrl },
      error: null,
    };
  }

  @Patch('files/:fileObjectId')
  async renameFile(
    @CurrentUser() user: AuthUser,
    @Param('fileObjectId') fileObjectId: string,
    @Body() dto: RenameFileDto,
  ): Promise<ApiResponse<FileResponseDto>> {
    const file = await this.filesService.renameFile(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      fileObjectId,
      dto,
    );

    return {
      data: file,
      error: null,
    };
  }

  @Delete('files/:fileObjectId')
  async deleteFile(
    @CurrentUser() user: AuthUser,
    @Param('fileObjectId') fileObjectId: string,
  ): Promise<ApiResponse<null>> {
    await this.filesService.deleteFile(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      fileObjectId,
    );

    return {
      data: null,
      error: null,
    };
  }
}

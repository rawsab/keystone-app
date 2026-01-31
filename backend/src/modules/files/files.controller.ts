import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../security/guards/jwt-auth.guard';
import { CurrentUser } from '../../security/decorators/current-user.decorator';
import { AuthUser } from '../../security/jwt.strategy';
import { FilesService } from './files.service';
import { PresignRequestDto } from './dto/presign-request.dto';
import { PresignResponseDto, PresignBatchResponseDto } from './dto/presign-response.dto';
import { FinalizeRequestDto } from './dto/finalize-request.dto';
import { FileResponseDto } from './dto/file-response.dto';
import { CompanyFileListItemDto } from './dto/company-file-list-item.dto';
import { CompanyContentsDto } from './dto/company-contents.dto';
import { ProjectContentsDto } from './dto/project-contents.dto';
import { FolderListItemDto } from './dto/folder-list-item.dto';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
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
  async listCompanyContents(
    @CurrentUser() user: AuthUser,
    @Query('folder_id') folderId?: string,
  ): Promise<ApiResponse<CompanyContentsDto>> {
    const contents = await this.filesService.listCompanyContents(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      folderId ?? null,
    );

    return {
      data: contents,
      error: null,
    };
  }

  @Post('files/folders')
  async createCompanyFolder(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateFolderDto,
  ): Promise<ApiResponse<FolderListItemDto>> {
    const folder = await this.filesService.createCompanyFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      dto,
    );

    return {
      data: folder,
      error: null,
    };
  }

  @Get('projects/:projectId/files')
  async listProjectContents(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Query('folder_id') folderId?: string,
  ): Promise<ApiResponse<ProjectContentsDto>> {
    const contents = await this.filesService.listProjectContents(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      folderId ?? null,
    );

    return {
      data: contents,
      error: null,
    };
  }

  @Post('projects/:projectId/folders')
  async createProjectFolder(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Body() dto: CreateFolderDto,
  ): Promise<ApiResponse<FolderListItemDto>> {
    const folder = await this.filesService.createProjectFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      dto,
    );

    return {
      data: folder,
      error: null,
    };
  }

  @Patch('projects/:projectId/folders/:folderId')
  async renameProjectFolder(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
    @Body() dto: RenameFolderDto,
  ): Promise<ApiResponse<FolderListItemDto>> {
    const folder = await this.filesService.renameProjectFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      folderId,
      dto,
    );

    return {
      data: folder,
      error: null,
    };
  }

  @Delete('projects/:projectId/folders/:folderId')
  async deleteProjectFolder(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
    @Param('folderId') folderId: string,
  ): Promise<ApiResponse<null>> {
    await this.filesService.deleteProjectFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      projectId,
      folderId,
    );

    return {
      data: null,
      error: null,
    };
  }

  @Patch('files/folders/:folderId')
  async renameCompanyFolder(
    @CurrentUser() user: AuthUser,
    @Param('folderId') folderId: string,
    @Body() dto: RenameFolderDto,
  ): Promise<ApiResponse<FolderListItemDto>> {
    const folder = await this.filesService.renameCompanyFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      folderId,
      dto,
    );

    return {
      data: folder,
      error: null,
    };
  }

  @Delete('files/folders/:folderId')
  async deleteCompanyFolder(
    @CurrentUser() user: AuthUser,
    @Param('folderId') folderId: string,
  ): Promise<ApiResponse<null>> {
    await this.filesService.deleteCompanyFolder(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      folderId,
    );

    return {
      data: null,
      error: null,
    };
  }

  @Get('files/:fileObjectId/download-url')
  async getFileDownloadUrl(
    @CurrentUser() user: AuthUser,
    @Param('fileObjectId') fileObjectId: string,
    @Query('preview') preview?: string,
  ): Promise<ApiResponse<{ download_url: string }>> {
    const downloadUrl = await this.filesService.getDownloadUrl(
      {
        userId: user.userId,
        companyId: user.companyId,
        role: user.role,
      },
      fileObjectId,
      { preview: preview === '1' || preview === 'true' },
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

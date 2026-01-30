import { IsString, IsEnum } from 'class-validator';
import { ProjectRole } from '../../../../security/rbac';

export class AddMemberDto {
  @IsString()
  user_id: string;

  @IsEnum(ProjectRole)
  project_role: ProjectRole;
}

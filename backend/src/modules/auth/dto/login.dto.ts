import { IsEmail, IsString } from 'class-validator';

/**
 * Login request DTO
 */
export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

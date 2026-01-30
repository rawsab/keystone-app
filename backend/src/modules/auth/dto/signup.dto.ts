import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * Signup request DTO
 */
export class SignupDto {
  @IsString()
  @MinLength(1)
  company_name: string;

  @IsString()
  @MinLength(1)
  full_name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

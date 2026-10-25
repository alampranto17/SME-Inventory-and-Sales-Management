import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// POST /auth/register -> creates a new company + its owner
export class RegisterDto {
  @IsString()
  @IsNotEmpty({ message: 'Company name is required' })
  @MinLength(3, { message: 'Company name must be at least 3 characters' })
  @MaxLength(200)
  companyName: string;

  @IsString()
  @IsNotEmpty({ message: 'Full name is required' })
  @Matches(/^[a-zA-Z\s]{3,50}$/, {
    message: 'Full name must be 3-50 characters and letters only',
  })
  fullName: string;

  @Matches(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, {
    message: 'Invalid email format',
  })
  email: string;

  @IsString()
  @MinLength(8, { message: 'password must be at least 8 characters' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must have uppercase, lowercase, number and special character (@$!%*?&)',
    },
  )
  password: string;
}

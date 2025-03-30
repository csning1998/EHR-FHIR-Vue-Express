import { IsEmail, IsNotEmpty, MaxLength, MinLength } from 'class-validator'

/**
 * Data Transfer Object (DTO) for user registration details.
 */
export class RegisterUserDto {
    /**
     * The user's email address.
     * Must be non-empty, a valid email format, and no longer than 100 characters.
     */
    @IsNotEmpty({ message: 'Email is a required field' })
    @IsEmail({}, { message: 'Invalid email format' })
    @MaxLength(100)
    email!: string;

    /**
     * The user's password.
     * Must be non-empty, at least 8 characters long, and no longer than 100 characters.
     */
    @IsNotEmpty({ message: 'Password is a required field' })
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @MaxLength(100)
    // Optional: Add password complexity regex if needed
    // @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/, {
    //   message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    // })
    password!: string;
}

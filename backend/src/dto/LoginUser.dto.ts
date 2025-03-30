import { IsEmail, IsNotEmpty, MaxLength } from 'class-validator'

/**
 * Data Transfer Object (DTO) for user login credentials.
 */
export class LoginUserDto {
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
     * Must be non-empty.
     */
    @IsNotEmpty({ message: 'Password is a required field' })
    password!: string;
}

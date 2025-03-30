// src/services/auth.service.ts
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import * as jwt from 'jsonwebtoken'
import { AppDataSource } from '../config/dataSource'
import { UserEntity } from '../models/entities/User.entity'
import config from '../config'
import { RegisterUserDto } from '../dto/RegisterUser.dto'
import { ConflictError } from '../utils/error' // Assumed these custom errors are defined
import ms from 'ms' // Utility for converting time strings (e.g., '7d') to milliseconds

/**
 * @interface JwtPayload
 * @description Defines the standard structure for the JWT payload.
 * Contains essential, non-sensitive user information needed for authentication and authorization checks.
 * @property {number} userId - The unique identifier for the user (primary key from the database). Essential for identifying the user across requests.
 * @property {string} email - User's email. Often used for display or logging, but primarily userId is used for lookups.
 * @property {string[]} [roles] - Optional: User roles array. Useful for role-based access control (RBAC) directly within the token, reducing database lookups for permissions.
 */
export interface JwtPayload {
    userId: number;
    email: string;
    // roles?: string[]; // Example: uncomment if roles are included
}

/**
 * @class AuthService
 * @description Encapsulates all authentication-related business logic, including user registration,
 * credential validation, token generation (Access & Refresh), and token validation/invalidation.
 * It interacts directly with the UserEntity repository.
 * @design Separating authentication logic into a dedicated service promotes modularity and testability,
 * keeping the controller layer thin and focused on request/response handling.
 */
export class AuthService {
    /**
     * @private
     * @readonly
     * @property {Repository<UserEntity>} userRepository - Instance of the TypeORM repository for UserEntity.
     * @description Provides methods for database interactions related to users (find, save, update).
     * It's injected or instantiated within the service for data persistence.
     */
    private readonly userRepository: Repository<UserEntity>;

    constructor() {
        this.userRepository = AppDataSource.getRepository(UserEntity);
    }

    /**
     * @method register
     * @description Registers a new user after validating the input DTO and checking for email conflicts.
     * @param {RegisterUserDto} registerDto - Data Transfer Object containing validated registration data (email, password).
     * @returns {Promise<Omit<UserEntity, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'>>} The newly created user object, excluding sensitive fields like password and refresh token details.
     * @throws {ConflictError} If a user with the provided email already exists in the database.
     * @design Uses DTO for input validation (handled before calling service or at the beginning).
     * Password hashing is delegated to the UserEntity's `@BeforeInsert` hook for separation of concerns.
     * Returns only non-sensitive user data suitable for sending back to the client.
     */
    async register(
        registerDto: RegisterUserDto
    ): Promise<Omit<UserEntity, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'>> {
        const { email, password } = registerDto;

        const existingUser = await this.userRepository.findOneBy({ email });
        if (existingUser) {
            // Throw a specific, operational error for clear handling in the controller.
            throw new ConflictError('This email is already registered');
        }

        // Create an entity instance. The password will be hashed by the @BeforeInsert hook in UserEntity.
        const newUser = this.userRepository.create({ email, password });
        const savedUser = await this.userRepository.save(newUser);
        console.log(`[AuthService] User registered successfully with ID: ${savedUser.id}`);

        // Explicitly omit sensitive fields before returning the user object.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            password: _, // Rename 'password' to '_' to indicate it's intentionally unused
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            refreshToken,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            refreshTokenExpiresAt,
            ...userWithoutSensitiveData // Use object destructuring and rest operator
        } = savedUser;
        // @ts-expect-error: TypeScript might complain about the type mismatch after omitting, but it's intended.
        return userWithoutSensitiveData;
    }

    /**
     * @method validateUser
     * @description Verifies a user's email and password against the stored hash.
     * @param {string} email - The user's email.
     * @param {string} pass - The plaintext password attempt.
     * @returns {Promise<UserEntity | null>} The full UserEntity if credentials are valid, otherwise null.
     * @design Uses bcrypt.compare for secure password verification (timing attack resistant).
     * Returns the full entity internally for subsequent token generation, but sensitive data should NOT be exposed outside the service/controller boundary handling login.
     */
    async validateUser(email: string, pass: string): Promise<UserEntity | null> {
        const user = await this.userRepository.findOneBy({ email });
        // Check if user exists AND the provided password matches the stored hash.
        if (user && (await bcrypt.compare(pass, user.password))) {
            console.log(`[AuthService] User validation successful for: ${email}`);
            return user;
        }
        console.warn(`[AuthService] User validation failed for: ${email}`);
        return null;
    }

    /**
     * @method generateAccessToken
     * @description Creates a short-lived JWT Access Token containing the user payload.
     * @param {JwtPayload} payload - The data to embed in the token (userId, email, optional roles).
     * @returns {string} The signed JWT access token.
     * @throws {Error} If JWT_PRIVATE_KEY is not configured in the environment.
     * @design Uses asymmetric signing (RS256) requiring a private/public key pair, which is generally more secure than symmetric (HS256) for web apps.
     * Relies on configuration for expiration time, issuer, and audience for standard JWT validation.
     */
    generateAccessToken(payload: JwtPayload): string {
        if (!config.jwt.privateKey) {
            console.error('[AuthService] FATAL: JWT_PRIVATE_KEY is not configured.');
            throw new Error('JWT Private Key not configured');
        }
        // @ts-expect-error: jwt.sign has multiple overloads, TS might pick the wrong one without explicit casting.
        return jwt.sign(payload, config.jwt.privateKey, {
            algorithm: 'RS256', // Specify the algorithm explicitly.
            expiresIn: config.jwt.accessTokenExpiresIn, // e.g., '15m'
            issuer: config.jwt.issuer,
            audience: config.jwt.audience,
        });
    }

    /**
     * @method generateAndSaveRefreshToken
     * @description Creates a long-lived JWT Refresh Token, stores it (or its hash) in the database associated with the user, and sets its expiration.
     * @param {UserEntity} user - The user entity for whom to generate the token.
     * @returns {Promise<string>} The signed JWT refresh token.
     * @throws {Error} If JWT_PRIVATE_KEY is not configured.
     * @design
     * - Persistence: Stores the refresh token (or a hash) in the DB. This allows for server-side invalidation (logout).
     * - Expiration: Calculates and stores the DB expiration time alongside the token.
     * - Security Consideration: Storing the raw token is simpler but less secure if the DB is compromised. Hashing the token before storage is recommended for better security, though it adds complexity to validation (compare hash instead of token value). This implementation stores the raw token for simplicity.
     * - Signing: Also uses RS256 for consistency, though HS256 could be acceptable if the secret is well-managed.
     * @future_consideration Implement refresh token hashing for enhanced security.
     */
    async generateAndSaveRefreshToken(user: UserEntity): Promise<string> {
        if (!config.jwt.privateKey) {
            console.error(
                '[AuthService] FATAL: JWT_PRIVATE_KEY is not configured for refresh token.'
            );
            throw new Error('JWT Private Key not configured');
        }

        const payload: JwtPayload = { userId: user.id, email: user.email }; // Refresh token payload can be minimal, userId is key.
        const expiresInStr = config.jwt.refreshTokenExpiresIn; // e.g., '7d'

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const refreshToken = jwt.sign(payload, config.jwt.privateKey, {
            algorithm: 'RS256',
            expiresIn: expiresInStr,
            issuer: config.jwt.issuer,
            // audience: config.jwt.audience, // Audience might differ for refresh tokens
        });

        // Calculate expiration timestamp using 'ms' library
        const expiresInMs = ms(expiresInStr as any); // Convert time string like '7d' to milliseconds

        const expiresAt = new Date(Date.now() + expiresInMs);

        // Update the user record in the database with the new token and its expiry.
        user.refreshToken = refreshToken; // Storing raw token for simplicity. Consider hashing: await bcrypt.hash(refreshToken, 10);
        user.refreshTokenExpiresAt = expiresAt;
        await this.userRepository.save(user); // Persist changes to the database.
        console.log(`[AuthService] Refresh token generated and saved for user ID: ${user.id}`);

        return refreshToken;
    }

    /**
     * @method login
     * @description Orchestrates the login process after successful validation. Generates both access and refresh tokens.
     * @param {UserEntity} user - The validated user entity.
     * @returns {Promise<{ accessToken: string; refreshToken: string; user: Omit<UserEntity, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'> }>} Object containing the tokens and sanitized user data.
     * @design This method consolidates token generation after successful validation (`validateUser`).
     * It ensures that both necessary tokens are created and returns them along with user data suitable for the client.
     */
    async login(user: UserEntity): Promise<{
        accessToken: string;
        refreshToken: string;
        user: Omit<UserEntity, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'>;
    }> {
        const payload: JwtPayload = { userId: user.id, email: user.email }; // Payload for the access token.
        const accessToken = this.generateAccessToken(payload);
        const refreshToken = await this.generateAndSaveRefreshToken(user); // Generates and saves the refresh token.

        // Prepare the user object to be returned, omitting sensitive fields.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            password: _,
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            refreshToken: rt, // Exclude the actual refresh token from the response body
            refreshTokenExpiresAt: rtea, // Exclude expiry from the response body
            ...userWithoutSensitiveData
        } = user;

        console.log(`[AuthService] User login processed for ID: ${user.id}. Tokens generated.`);
        // @ts-expect-error: Type omission intended.
        return { accessToken, refreshToken, user: userWithoutSensitiveData };
    }

    /**
     * @method validateRefreshToken
     * @description Verifies a given refresh token against the stored token in the database and checks its validity and expiration.
     * @param {string} token - The refresh token received from the client (usually via cookie).
     * @returns {Promise<UserEntity | null>} The UserEntity if the token is valid, belongs to the user, and hasn't expired in the DB; otherwise null.
     * @throws {Error} If JWT_PUBLIC_KEY is not configured.
     * @design
     * 1. Verifies the JWT signature and standard claims (like expiry) using the public key.
     * 2. Extracts the userId from the payload.
     * 3. Fetches the corresponding user from the database.
     * 4. **Crucially, compares the received token with the token stored in the database.** This prevents replay attacks if a token was compromised but later invalidated on the server.
     * 5. Checks the database expiration timestamp (`refreshTokenExpiresAt`).
     * 6. If the DB token doesn't match or is expired, it invalidates the user's tokens as a security measure (optional but recommended).
     */
    async validateRefreshToken(token: string): Promise<UserEntity | null> {
        if (!config.jwt.publicKey) {
            console.error(
                '[AuthService] FATAL: JWT_PUBLIC_KEY is not configured for refresh token validation.'
            );
            throw new Error('JWT Public Key not configured');
        }
        try {
            // 1. Verify JWT signature and standard claims
            const payload = jwt.verify(token, config.jwt.publicKey, {
                algorithms: ['RS256'],
                issuer: config.jwt.issuer,
                // audience: config.jwt.audience, // Check audience if it's specific to refresh tokens
            }) as JwtPayload;

            // 2. Fetch user based on userId from payload
            const user = await this.userRepository.findOneBy({ id: payload.userId });

            // 3. & 4. & 5. Validate against DB record
            if (
                !user || // User not found
                user.refreshToken !== token || // Token mismatch (IMPORTANT for invalidation) - Use hash comparison if storing hashes.
                !user.refreshTokenExpiresAt || // Expiry not set in DB
                user.refreshTokenExpiresAt < new Date() // Token expired according to DB record
            ) {
                console.warn(
                    `[AuthService] Refresh token validation failed for user ID: ${payload.userId}. Reason: Mismatch, missing, or expired in DB.`
                );
                // 6. Optional: Invalidate tokens if a mismatch occurs (potential token theft indicator)
                if (user && user.refreshToken && user.refreshToken !== token) {
                    console.log(
                        `[AuthService] Potential token reuse/theft detected for user ID: ${user.id}. Invalidating tokens.`
                    );
                    await this.invalidateUserTokens(user.id);
                }
                return null; // Token is invalid or compromised
            }

            console.log(
                `[AuthService] Refresh token validated successfully for user ID: ${user.id}`
            );
            return user; // Token is valid
        } catch (error: any) {
            // Handle JWT verification errors (e.g., TokenExpiredError, JsonWebTokenError)
            console.warn(
                `[AuthService] JWT verification failed for refresh token: ${error.name} - ${error.message}`
            );
            return null; // Token is invalid due to JWT error
        }
    }

    /**
     * @method invalidateUserTokens
     * @description Clears the refresh token and its expiration from the database for a specific user, effectively logging them out from all sessions using that refresh token.
     * @param {number} userId - The ID of the user whose tokens are to be invalidated.
     * @returns {Promise<void>}
     * @design This is the core mechanism for server-side logout and session invalidation.
     */
    async invalidateUserTokens(userId: number): Promise<void> {
        await this.userRepository.update(
            { id: userId },
            {
                refreshToken: null, // Clear the token
                refreshTokenExpiresAt: null, // Clear the expiry
            }
        );
        console.log(`[AuthService] Tokens invalidated for user ID: ${userId}`);
    }

    /**
     * @method logout
     * @description Logs out a user by invalidating their stored refresh token on the server-side.
     * The controller counterpart should handle clearing client-side cookies.
     * @param {number} userId - The ID of the user to log out.
     * @returns {Promise<void>}
     */
    async logout(userId: number): Promise<void> {
        await this.invalidateUserTokens(userId);
        console.log(`[AuthService] Logout processed for user ID: ${userId}`);
    }
}

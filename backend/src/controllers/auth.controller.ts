// src/controllers/auth.controller.ts
import { CookieOptions, NextFunction, Request, Response } from 'express';
import { validate } from 'class-validator'; // Input validation library
import { plainToInstance } from 'class-transformer'; // Transforms plain objects to class instances (DTOs)
import { AuthService } from '../services/auth.service'; // Core authentication logic service
import { RegisterUserDto } from '../dto/RegisterUser.dto'; // DTO for registration input
import { LoginUserDto } from '../dto/LoginUser.dto'; // DTO for login input
import config from '../config'; // Application configuration (JWT secrets, cookie settings, etc.)
import ms from 'ms'; // Utility to convert time strings (like '15m', '7d') to milliseconds for cookie maxAge

// Instantiate the AuthService (in a real app, this might be handled by Dependency Injection)
const authService = new AuthService();

/**
 * @function setTokenCookies
 * @private
 * @description Helper function to set the accessToken and refreshToken as HTTP-only cookies in the response.
 * @param {Response} res - The Express response object.
 * @param {string} accessToken - The JWT access token.
 * @param {string} refreshToken - The JWT refresh token.
 * @returns {void}
 * @design
 * - HttpOnly: `true` - Prevents client-side JavaScript from accessing the cookies, mitigating XSS attacks aiming to steal tokens. This is the core security benefit of this approach.
 * - Secure: `true` (in production) - Ensures cookies are only sent over HTTPS connections, preventing eavesdropping. Determined by `NODE_ENV`.
 * - SameSite:
 * - 'lax' for accessToken: Allows the cookie to be sent on top-level navigations and GET requests initiated by third-party websites, which is generally safe for access tokens used within the API.
 * - 'strict' for refreshToken: Provides stronger CSRF protection. The refresh token cookie will only be sent on requests originating from the exact same site. The refresh endpoint (`/api/auth/refresh`) must be on the same site.
 * - Path:
 * - '/' for accessToken: Makes it available for all API paths under the base domain.
 * - '/api/auth/refresh' for refreshToken: Restricts the refresh token cookie to only be sent to the refresh endpoint, minimizing its exposure.
 * - MaxAge: Sets the cookie expiration time in milliseconds, derived from the JWT expiration configuration using the `ms` library. Aligns cookie lifetime with token lifetime.
 * - Domain: Allows specifying a domain (e.g., '.example.com') if cookies need to be shared across subdomains. Read from config.
 * @security This function encapsulates the secure configuration for setting authentication cookies.
 */
const setTokenCookies = (res: Response, accessToken: string, refreshToken: string): void => {
    const secure = config.nodeEnv === 'production'; // Use secure cookies only in production (HTTPS)
    const domain = config.cookie.domain; // Optional: Read domain from config for cross-subdomain cookies

    // Calculate maxAge in milliseconds from config strings (e.g., '15m', '7d')
    // Add explicit type check as `ms` can return undefined for invalid input.
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const accessMaxAgeMs = ms(config.jwt.accessTokenExpiresIn as string);
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    const refreshMaxAgeMs = ms(config.jwt.refreshTokenExpiresIn as string);

    // Access Token Cookie Options
    const accessTokenCookieOptions: CookieOptions = {
        httpOnly: true, // Cannot be accessed by client-side JS
        secure: secure, // Only sent over HTTPS in production
        sameSite: 'lax', // Good balance for access tokens
        path: '/', // Available to all paths
        ...(typeof accessMaxAgeMs === 'number' && { maxAge: accessMaxAgeMs }), // Set maxAge only if valid number
        ...(domain && { domain: domain }), // Set domain if configured
    };

    // Refresh Token Cookie Options
    const refreshTokenCookieOptions: CookieOptions = {
        httpOnly: true, // Cannot be accessed by client-side JS
        secure: secure, // Only sent over HTTPS in production
        sameSite: 'strict', // Stricter protection for refresh token
        path: '/api/auth/refresh', // IMPORTANT: Restrict path to only the refresh endpoint
        ...(typeof refreshMaxAgeMs === 'number' && { maxAge: refreshMaxAgeMs }), // Set maxAge only if valid number
        ...(domain && { domain: domain }), // Set domain if configured
    };

    console.log(
        '[AuthController] Setting accessToken cookie with options:',
        accessTokenCookieOptions
    );
    console.log(
        '[AuthController] Setting refreshToken cookie with options:',
        refreshTokenCookieOptions
    );

    res.cookie('accessToken', accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', refreshToken, refreshTokenCookieOptions);
};

/**
 * @function clearTokenCookies
 * @private
 * @description Helper function to clear authentication cookies from the client's browser.
 * @param {Response} res - The Express response object.
 * @returns {void}
 * @design Must use the same `path` and `domain` options as when the cookies were set to ensure they are properly cleared by the browser.
 */
const clearTokenCookies = (res: Response): void => {
    const domain = config.cookie.domain; // Read from config
    const secure = config.nodeEnv === 'production';
    const baseOptions: CookieOptions = {
        httpOnly: true,
        secure: secure,
        ...(domain && { domain: domain }), // Include domain if it was used to set the cookie
    };

    console.log('[AuthController] Clearing authentication cookies...');
    // Clear accessToken cookie
    res.clearCookie('accessToken', { ...baseOptions, path: '/', sameSite: 'lax' });
    // Clear refreshToken cookie (ensure path matches where it was set)
    res.clearCookie('refreshToken', {
        ...baseOptions,
        path: '/api/auth/refresh',
        sameSite: 'strict',
    });
};

/**
 * @controller register
 * @description Handles POST requests to `/api/auth/register`. Validates input using RegisterUserDto,
 * calls AuthService.register, and sends back the created user data (without sensitive fields).
 * @route POST /api/auth/register
 */
export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Transform plain request body to DTO instance.
    const registerDto = plainToInstance(RegisterUserDto, req.body);
    // 2. Validate the DTO using class-validator decorators.
    const errors = await validate(registerDto);

    // 3. Handle Validation Errors
    if (errors.length > 0) {
        console.warn('[AuthController][Register] Validation failed:', errors);
        // Return a 400 Bad Request with validation error details.
        res.status(400).json({ message: 'Input validation failed', errors });
        return; // Stop processing
    }

    try {
        // 4. Delegate user creation logic to the AuthService.
        console.log(`[AuthController][Register] Attempting registration for: ${registerDto.email}`);
        const user = await authService.register(registerDto);
        console.log(`[AuthController][Register] Registration successful for ID: ${user.id}`);
        // 5. Send successful response (201 Created). User object returned by service excludes sensitive data.
        res.status(201).json(user);
    } catch (error) {
        // 6. Catch errors from the service (e.g., ConflictError) and pass to the global error handler.
        console.error(
            `[AuthController][Register] Error during registration for ${registerDto.email}:`,
            error
        );
        next(error);
    }
};

/**
 * @controller login
 * @description Handles POST requests to `/api/auth/login`. Validates credentials using LoginUserDto,
 * calls AuthService to validate user and generate tokens, sets tokens in HttpOnly cookies, and sends back user data.
 * @route POST /api/auth/login
 */
export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const loginDto = plainToInstance(LoginUserDto, req.body);
    const errors = await validate(loginDto);

    if (errors.length > 0) {
        console.warn('[AuthController][Login] Validation failed:', errors);
        res.status(400).json({ message: 'Input validation failed', errors });
        return;
    }

    try {
        // 1. Validate user credentials using the service.
        console.log(`[AuthController][Login] Attempting login for: ${loginDto.email}`);
        const user = await authService.validateUser(loginDto.email, loginDto.password);

        // 2. Handle Invalid Credentials
        if (!user) {
            console.warn(`[AuthController][Login] Invalid credentials for: ${loginDto.email}`);
            // Return 401 Unauthorized for incorrect credentials. Avoid specifying *which* part was wrong (email or password).
            res.status(401).json({ message: 'Incorrect email or password' });
            return;
        }

        // 3. Credentials valid - proceed with login logic (token generation) in the service.
        const { accessToken, refreshToken, user: loggedInUser } = await authService.login(user);
        console.log(
            `[AuthController][Login] Login successful for ID: ${user.id}. Setting cookies.`
        );

        // 4. Set tokens as HttpOnly cookies in the response.
        setTokenCookies(res, accessToken, refreshToken);

        // 5. Send successful response (200 OK) with non-sensitive user data.
        res.status(200).json(loggedInUser);
    } catch (error) {
        // 6. Catch unexpected errors during login/token generation.
        console.error(`[AuthController][Login] Error during login for ${loginDto.email}:`, error);
        next(error);
    }
};

/**
 * @controller refresh
 * @description Handles POST requests to `/api/auth/refresh`. Uses the refreshToken from HttpOnly cookie
 * to generate a new accessToken and resets the accessToken cookie.
 * @route POST /api/auth/refresh
 * @design This endpoint does *not* typically require the `authMiddleware` because its purpose is to get a new *access* token when the old one has expired, using the *refresh* token for authentication. The refresh token itself is validated by the `AuthService`.
 */
export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Extract refresh token from the specific HttpOnly cookie.
    const incomingRefreshToken = req.cookies.refreshToken;

    if (!incomingRefreshToken) {
        console.warn('[AuthController][Refresh] Refresh token cookie missing.');
        res.status(401).json({ message: 'Refresh token missing' }); // Unauthorized or Bad Request (400) could be argued. 401 is common.
        return;
    }

    try {
        // 2. Validate the refresh token using the AuthService.
        // This checks signature, expiry, and if it matches the one stored for the user in the DB.
        console.log('[AuthController][Refresh] Attempting to validate refresh token...');
        const user = await authService.validateRefreshToken(incomingRefreshToken);

        // 3. Handle Invalid Refresh Token
        if (!user) {
            console.warn('[AuthController][Refresh] Invalid or expired refresh token provided.');
            // Clear potentially invalid cookies on the client side as a precaution.
            clearTokenCookies(res);
            // Return 403 Forbidden, as the refresh attempt is denied.
            res.status(403).json({ message: 'Refresh token is invalid or expired' });
            return;
        }

        // 4. Refresh token is valid - generate a new Access Token.
        console.log(
            `[AuthController][Refresh] Refresh token validated for user ID: ${user.id}. Generating new access token.`
        );
        const payload = { userId: user.id, email: user.email /*, roles: user.roles */ }; // Recreate payload
        const newAccessToken = authService.generateAccessToken(payload);

        // --- Decide on Refresh Token Rotation ---
        // Option A: Rotate Refresh Token (More Secure, More Complex)
        // const newRefreshToken = await authService.generateAndSaveRefreshToken(user);
        // setTokenCookies(res, newAccessToken, newRefreshToken); // Reset both cookies
        // console.log(`[AuthController][Refresh] Access and Refresh tokens rotated for user ID: ${user.id}.`);

        // Option B: Keep Refresh Token (Simpler) - Current Implementation
        // Only reset the Access Token cookie. The Refresh Token cookie remains unchanged until it expires or is invalidated.
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const accessMaxAgeMs = ms(config.jwt.accessTokenExpiresIn as string);
        const secure = config.nodeEnv === 'production';
        const domain = config.cookie.domain;
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: secure,
            sameSite: 'lax',
            path: '/',
            ...(typeof accessMaxAgeMs === 'number' && { maxAge: accessMaxAgeMs }),
            ...(domain && { domain: domain }),
        });
        console.log(
            `[AuthController][Refresh] New access token generated and cookie set for user ID: ${user.id}.`
        );
        // --- End Option B ---

        // 5. Send successful response.
        res.status(200).json({ message: 'Access token refreshed successfully' });
    } catch (error) {
        // 6. Catch unexpected errors during refresh process.
        console.error('[AuthController][Refresh] Error during token refresh:', error);
        next(error);
    }
};

/**
 * @controller logout
 * @description Handles POST requests to `/api/auth/logout`. Invalidates the user's refresh token
 * on the server-side via AuthService and clears authentication cookies on the client-side.
 * @route POST /api/auth/logout
 * @design Requires `authMiddleware` to identify the user (`req.user`) whose token needs invalidation. Clears cookies regardless of whether the backend invalidation succeeds, ensuring the frontend session ends.
 */
export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Extract userId from the request object (populated by authMiddleware).
    const userId = (req as any).user?.userId;

    // Although authMiddleware checks for a valid access token, the refresh token might still be present.
    // const refreshToken = req.cookies.refreshToken; // Not strictly needed here unless logging/auditing

    try {
        if (userId) {
            // 2. Invalidate the refresh token on the backend via AuthService.
            console.log(
                `[AuthController][Logout] Attempting to invalidate tokens for user ID: ${userId}`
            );
            await authService.logout(userId);
            console.log(
                `[AuthController][Logout] Backend tokens invalidated for user ID: ${userId}`
            );
        } else {
            // This case should ideally not happen if authMiddleware is working correctly,
            // but handle defensively.
            console.warn(
                '[AuthController][Logout] Logout called but no user ID found on request after authMiddleware.'
            );
        }

        // 3. Always clear the client-side cookies.
        clearTokenCookies(res);
        console.log('[AuthController][Logout] Client-side cookies cleared.');

        // 4. Send successful response.
        res.status(200).json({ message: 'Logout successful' });
    } catch (error) {
        // 5. Catch errors during the backend invalidation process.
        console.error(
            `[AuthController][Logout] Error during logout for user ID: ${userId}:`,
            error
        );
        // Clear cookies even if backend fails, then pass error.
        clearTokenCookies(res);
        next(error);
    }
};

/**
 * @controller getMe
 * @description Handles GET requests to `/api/auth/me`. Returns information about the
 * currently authenticated user based on the data attached by `authMiddleware`.
 * @route GET /api/auth/me
 * @design Protected route requiring a valid access token (verified by `authMiddleware`).
 * Returns the payload (`req.user`) directly. For enhanced security or more data,
 * could fetch fresh user data from the DB using `req.user.userId` and return a sanitized DTO.
 */
export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // 1. Access the user payload attached by authMiddleware.
    const userPayload = (req as any).user; // Contains { userId, email, roles? }

    if (!userPayload) {
        // This indicates an issue with authMiddleware or route setup if reached.
        console.error('[AuthController][GetMe] Error: req.user not found after authMiddleware.');
        // Use next() to pass to error handler, indicating an internal issue.
        return next(new Error('Authentication context not found after middleware.'));
        // Or send 401 directly, though middleware should have caught this.
        // return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        // Option A: Return payload directly (simple, potentially slightly stale data)
        console.log(
            `[AuthController][GetMe] Returning user info from token for user ID: ${userPayload.userId}`
        );
        res.status(200).json(userPayload);

        /** Option B: Fetch fresh user data from DB (more current, requires service call)
       console.log(`[AuthController][GetMe] Fetching fresh user data for user ID: ${userPayload.userId}`);
       const userService = new UserService(); // Assuming a UserService exists
       const freshUser = await userService.findById(userPayload.userId);
       if (!freshUser) {
       // User existed in token but not DB? Indicates inconsistency.
       console.warn(`[AuthController][GetMe] User ID ${userPayload.userId} found in token but not in DB.`);
       return res.status(404).json({ message: 'User not found' });
       }
       // eslint-disable-next-line @typescript-eslint/no-unused-vars
       const { password, refreshToken, refreshTokenExpiresAt, ...safeUserData } = freshUser;
       res.status(200).json(safeUserData);
       */
    } catch (error) {
        console.error(
            `[AuthController][GetMe] Error retrieving user info for user ID: ${userPayload?.userId}:`,
            error
        );
        next(error); // Pass DB errors or others to the handler.
    }
};

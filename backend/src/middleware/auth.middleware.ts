// src/middleware/auth.middleware.ts
import { NextFunction, Request, Response } from 'express'
import * as jwt from 'jsonwebtoken'
import config from '../config'
// Import the payload structure defined in AuthService for type safety
import { JwtPayload } from '../services/auth.service'
// Import custom error type for consistency
import { UnauthorizedError } from '../utils/error'

/**
 * @interface AuthenticatedRequest
 * @extends Request
 * @description Extends the standard Express Request interface to include an optional `user` property.
 * This property will hold the decoded JWT payload after successful authentication,
 * making user information readily available in subsequent middleware and route handlers.
 * @property {JwtPayload} [user] - Optional property to store the decoded JWT payload.
 */
interface AuthenticatedRequest extends Request {
    user?: JwtPayload; // Use the imported JwtPayload type
}

/**
 * @function authMiddleware
 * @description Express middleware function to authenticate incoming requests using a JWT access token.
 * It expects the access token to be stored in an HTTP-only cookie named 'accessToken'.
 * @param {AuthenticatedRequest} req - The Express request object (extended with `user` property).
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next middleware function.
 * @returns {void} Calls `next()` if authentication succeeds, or `next(error)` if it fails.
 * @design
 * - Strategy: Uses HTTP-only cookies (`accessToken`) for token transport, which is generally safer against XSS attacks compared to localStorage.
 * - Verification: Uses the public key (`config.jwt.publicKey`) and RS256 algorithm to verify the token's signature.
 * - Standard Claims: Checks standard JWT claims like issuer (`iss`) and audience (`aud`) if configured, enhancing security.
 * - Payload Attachment: On successful verification, the decoded token payload (`JwtPayload`) is attached to `req.user`. This allows downstream handlers (e.g., controllers) to easily access authenticated user information (like `userId`) without re-parsing the token.
 * - Error Handling: Uses `next(error)` to pass specific `UnauthorizedError` instances (or a generic server error if config is missing) to the central error handling middleware. This promotes consistent error responses.
 * @security This middleware ONLY verifies the access token. It does NOT handle token refresh. Expired access tokens will result in a 401 error, which should be caught by the client/API client interceptor to trigger the refresh flow (`/api/auth/refresh`).
 */
const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // 1. Extract token from the 'accessToken' HTTP-only cookie.
    const token = req.cookies.accessToken;

    if (!token) {
        console.warn('[AuthMiddleware] Access token missing from cookies.');
        // Pass a specific UnauthorizedError to the error handler.
        return next(new UnauthorizedError('Access token missing'));
    }

    // 2. Ensure the public key is configured for verification. Critical for RS256.
    if (!config.jwt.publicKey) {
        console.error('[AuthMiddleware] FATAL: JWT Public Key is not configured.');
        // Pass a generic server error as this is a configuration issue.
        return next(new Error('Server configuration error: JWT public key missing.'));
    }

    try {
        // 3. Verify the token using the public key and configured options.
        const decoded = jwt.verify(token, config.jwt.publicKey, {
            algorithms: ['RS256'], // Explicitly specify the expected algorithm.
            issuer: config.jwt.issuer, // Validate the issuer claim if configured.
            audience: config.jwt.audience, // Validate the audience claim if configured.
        }) as JwtPayload; // Cast the decoded type to our defined JwtPayload interface.

        // 4. Attach the verified payload to the request object for downstream use.
        req.user = decoded;
        console.log(`[AuthMiddleware] Token verified successfully for user ID: ${decoded.userId}`);

        // 5. Proceed to the next middleware or route handler.
        next();
    } catch (error: any) {
        // 6. Handle specific JWT errors.
        console.warn(`[AuthMiddleware] JWT Verification Error: ${error.name} - ${error.message}`);
        if (error instanceof jwt.TokenExpiredError) {
            // Token has expired. The client should use the refresh token.
            return next(new UnauthorizedError('Access token has expired'));
        }
        if (error instanceof jwt.JsonWebTokenError) {
            // Covers signature issues, malformed tokens, etc.
            return next(new UnauthorizedError('Invalid access token'));
        }
        // Handle other potential errors during verification.
        return next(new UnauthorizedError('Token verification failed'));
    }
};

export default authMiddleware;

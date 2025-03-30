// src/app.ts
import express, { Express, NextFunction, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser'; // <--- Import
import config from './config'; // Import configuration
import mainRouter from './routes'; // Import main router
import { ConflictError, NotFoundError, UnauthorizedError } from './utils/error'; // Import custom errors (assumed to be defined)

const app: Express = express();

// --- Middleware ---
// Enable CORS
app.use(cors({ origin: config.corsOrigin, credentials: true })); // credentials: true if cookies/sessions are needed

// Parse JSON request bodies
app.use(express.json());

// Parse URL-encoded request bodies
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser(config.cookie.secret)); // <--- Use cookie-parser with secret for signing non-HttpOnly cookies

// --- Mount Routes ---
app.use(mainRouter); // Use main router to handle all requests

// --- Basic Error Handling Middleware (should be placed after all routes) ---
/**
 * Global error handling middleware.
 * @param {Error} err - The error object.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 * @param {NextFunction} next - The Express next function (unused).
 */
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error(`[Error] ${new Date().toISOString()} - ${req.path}`);
    console.error(err.stack);
    // In development, return detailed errors; in production, return a generic message
    let statusCode = (err as any).statusCode || 500; // Custom errors may include statusCode
    const message = config.nodeEnv === 'production' ? 'Server error occurred' : err.message;
    // Handle custom error types
    if (err instanceof NotFoundError) {
        statusCode = err.statusCode;
    } else if (err instanceof UnauthorizedError) {
        // Assuming you defined this
        statusCode = err.statusCode;
    } else if (err instanceof ConflictError) {
        // Assuming you defined this
        statusCode = err.statusCode;
    }
    // Handle class-validator errors (if not handled at the controller layer)
    // else if (Array.isArray(err) && err[0] instanceof ValidationError) {
    //     statusCode = 400;
    //     message = 'Input validation failed';
    //     errors = err.map(e => Object.values(e.constraints || {})).flat();
    // }
    // Handle JWT errors (if authMiddleware uses next(err))
    // else if (err.name === 'TokenExpiredError') {
    //     statusCode = 401;
    //     message = 'Token has expired';
    // } else if (err.name === 'JsonWebTokenError') {
    //     statusCode = 401;
    //     message = 'Invalid token';
    // }

    // Ensure the app doesn't crash if res has already been sent
    if (!res.headersSent) {
        res.status(statusCode).json({
            status: 'error',
            statusCode,
            message,
            // stack: config.nodeEnv === 'development' ? err.stack : undefined,
        });
    }
});

// --- Handle 404 Not Found ---
/**
 * Middleware to handle requests to undefined routes.
 * @param {Request} req - The Express request object.
 * @param {Response} res - The Express response object.
 */
app.use((req: Request, res: Response) => {
    res.status(404).json({
        status: 'error',
        statusCode: 404,
        message: `Resource not found: ${req.originalUrl}`,
    });
});

export default app;

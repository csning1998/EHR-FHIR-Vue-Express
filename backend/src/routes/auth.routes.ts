// src/routes/auth.routes.ts
import { Router } from 'express';
import { getMe, login, logout, refresh, register } from '../controllers/auth.controller';
import authMiddleware from '../middleware/auth.middleware'; // Import authentication middleware

const router = Router();

/**
 * Defines authentication-related routes for user management.
 */
router.post('/register', register); // User registration endpoint
router.post('/login', login); // User login endpoint
router.post('/refresh', refresh); // Token refresh endpoint; relies on refresh token cookie, no authMiddleware needed
router.post('/logout', authMiddleware, logout); // User logout endpoint; requires authMiddleware to identify the user
router.get('/me', authMiddleware, getMe); // Retrieve current user info; protected by authMiddleware

export default router;

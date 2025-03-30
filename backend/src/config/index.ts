// src/config/index.ts
import dotenv from 'dotenv'

/**
 * Loads environment variables from the .env file into process.env.
 * If the .env file is not found in non-production environments, a warning is logged.
 * @returns {void}
 */
const envFound = dotenv.config();
if (envFound.error && process.env.NODE_ENV !== 'production') {
    // In non-production environments, warn if the .env file is missing
    console.warn("⚠️ Couldn't find .env file. Using default or environment variables.");
}

/**
 * Application configuration object containing environment-specific settings.
 * @type {Object}
 * @property {string} nodeEnv - The current Node.js environment (e.g., 'development', 'production').
 * @property {number} port - The port on which the application runs.
 * @property {string} corsOrigin - The allowed CORS origin(s) for the server.
 * @property {Object} db - Database configuration settings.
 * @property {string} db.type - Database type (e.g., 'postgres').
 * @property {string} db.host - Database host address.
 * @property {number} db.port - Database port number.
 * @property {string | undefined} db.username - Database username.
 * @property {string | undefined} db.password - Database password.
 * @property {string | undefined} db.database - Database name.
 * @property {Object} fhir - FHIR-related configuration.
 * @property {string | undefined} fhir.targetServerUrl - Target FHIR server URL.
 * @property {Object} jwt - JWT configuration for authentication.
 * @property {string | undefined} jwt.privateKey - Private key for JWT signing.
 * @property {string | undefined} jwt.publicKey - Public key for JWT verification.
 * @property {string} jwt.accessTokenExpiresIn - Access token expiration time (e.g., '15m').
 * @property {string} jwt.refreshTokenExpiresIn - Refresh token expiration time (e.g., '7d').
 * @property {string | undefined} jwt.issuer - JWT issuer.
 * @property {string | undefined} jwt.audience - JWT audience.
 * @property {Object} cookie - Cookie configuration.
 * @property {string | undefined} cookie.secret - Secret key for signing cookies.
 * @property {string | undefined} cookie.domain - Cookie domain.
 */
const config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3001,
    corsOrigin: process.env.CORS_ORIGIN || '*', // In production, specify explicit origins
    // Add other configuration variables here, e.g., database URL, JWT keys, etc.
    db: {
        type: (process.env.DB_TYPE as any) || 'postgres', // TypeORM expects 'postgres'
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
        username: process.env.DB_USERNAME, // Remains undefined if not set
        password: process.env.DB_PASSWORD, // Remains undefined if not set
        database: process.env.DB_DATABASE, // Remains undefined if not set
    },
    fhir: {
        targetServerUrl: process.env.FHIR_TARGET_SERVER_URL,
    },
    jwt: {
        privateKey: process.env.JWT_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Handle newline characters
        publicKey: process.env.JWT_PUBLIC_KEY?.replace(/\\n/g, '\n'), // Handle newline characters
        accessTokenExpiresIn: process.env.JWT_ACCESS_TOKEN_EXPIRATION || '15m',
        refreshTokenExpiresIn: process.env.JWT_REFRESH_TOKEN_EXPIRATION || '7d',
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
    },
    cookie: {
        secret: process.env.COOKIE_SECRET,
        domain: process.env.COOKIE_DOMAIN || undefined,
    },
};

/**
 * Validates the presence of critical environment variables.
 * Throws errors or logs warnings based on the environment and missing variables.
 * @throws {Error} If critical variables (e.g., PORT, JWT keys) are missing.
 * @returns {void}
 */
if (!config.port) {
    throw new Error('Missing critical environment variable: PORT');
}
if (!config.db.username || !config.db.password || !config.db.database) {
    console.warn('⚠️ Missing Database Credentials in .env file. DB connection might fail.');
    // In production, consider throwing an error
    // if (config.nodeEnv === 'production') {
    //     throw new Error('Missing critical DB environment variables!');
    // }
}
if (!config.fhir.targetServerUrl) {
    console.warn(
        '⚠️ Missing FHIR_TARGET_SERVER_URL in environment variables. FHIR push will fail.'
    );
}

if (!config.jwt.privateKey || !config.jwt.publicKey) {
    throw new Error('Missing critical environment variables: JWT_PRIVATE_KEY or JWT_PUBLIC_KEY');
}
if (!config.cookie.secret) {
    console.warn('⚠️ Missing COOKIE_SECRET in .env file. Cookie signing might be insecure.');
    // In production, throw an error
    if (config.nodeEnv === 'production') throw new Error('Missing COOKIE_SECRET');
}

export default config;

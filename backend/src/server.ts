// backend/src/server.ts
// Entry point for the backend application. Handles initialization and server lifecycle.

// Required for TypeORM decorators (like @Entity, @Column) to work correctly.
// Must be imported at the very top, before any code that uses decorators or involves reflection.
import 'reflect-metadata'
import app from './app' // Import the configured Express application instance.
import config from './config' // Import application configuration (ports, env variables, etc.).
import { AppDataSource, dataSourceOptions } from './config/dataSource' // Import the TypeORM DataSource instance and its options.

// Retrieve the port number from the configuration.
const PORT = config.port;

/**
 * @function startServer
 * @description Asynchronously initializes the application:
 * 1. Initializes the TypeORM database connection (AppDataSource).
 * 2. Starts the Express server, making it listen on the configured PORT.
 * 3. Sets up signal handlers for graceful shutdown (SIGINT, SIGTERM).
 * @returns {Promise<void>} Resolves when the server is successfully started, or rejects/exits on critical errors.
 * @design Uses an async function to handle the asynchronous nature of database initialization.
 * Separates concerns: database init, server listening, and shutdown logic.
 * Includes basic error handling for critical startup failures (DB connection, port binding).
 */
async function startServer(): Promise<void> {
    try {
        // --- Step 1: Initialize Database Connection ---
        // Crucial step before starting the server, ensuring the database is ready.
        console.log('[Server Startup] Initializing TypeORM DataSource...');
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        console.log(
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            `[Server Startup] DB Config: Type=${dataSourceOptions.type}, Host=${dataSourceOptions.host}, Port=${dataSourceOptions.port}, DB=${dataSourceOptions.database}`
        );
        // `AppDataSource.initialize()` establishes the connection pool based on `dataSourceOptions`.
        // `await` ensures we don't proceed until the connection is confirmed or fails.
        await AppDataSource.initialize();
        console.log('[Database] Data source successfully initialized!');
        // Log synchronization status for clarity during development.
        if (dataSourceOptions.synchronize) {
            console.warn(
                '[Database] Schema synchronization is ENABLED (synchronize=true). This should ONLY be used in development.'
            );
        }

        // --- Step 2: Start Express Server Listener ---
        console.log(`[Server Startup] Attempting to start Express server on port ${PORT}...`);
        // `app.listen` starts the HTTP server.
        const server = app
            .listen(PORT, () => {
                // This callback executes *after* the server successfully starts listening.
                console.log(`[Server] ✅ Backend server listening on http://localhost:${PORT}`);
                console.log(`[Server]    Environment: ${config.nodeEnv}`);
                // Useful log: Indicate where the API is accessible from the host.
            })
            .on('error', (err: NodeJS.ErrnoException) => {
                // Catches immediate errors during the `listen` call itself (e.g., port already in use - EADDRINUSE).
                console.error(
                    `[Server] ❌ Failed to bind to port ${PORT}: ${err.message} (Code: ${err.code})`
                );
                // Attempt to clean up the database connection if it was initialized before the listen error occurred.
                if (AppDataSource.isInitialized) {
                    AppDataSource.destroy().catch((dbErr) =>
                        console.error(
                            '[Database] Error closing DB connection after server listen failure:',
                            dbErr
                        )
                    );
                }
                process.exit(1); // Exit immediately as the server cannot start.
            });
        console.log(`[Server Startup] Express server instance created, listening initiated.`);

        // --- Step 3: Implement Graceful Shutdown ---
        // Handles process termination signals (like Ctrl+C or signals from orchestrators like Docker/Kubernetes).
        // Rationale: Allows ongoing requests to finish and cleans up resources (like DB connections) before exiting.
        // Prevents abrupt termination which can lead to data corruption or orphaned connections.
        const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM']; // Common termination signals.
        signals.forEach((signal) => {
            process.on(signal, () => {
                // Register a listener for each signal.
                console.info(
                    `[Server Shutdown] Received ${signal}. Initiating graceful shutdown...`
                );
                // 1. Stop accepting new connections by closing the HTTP server.
                server.close(async () => {
                    // `server.close` stops listening and executes the callback once all existing connections are closed.
                    console.log(
                        '[Server Shutdown] HTTP server closed. No longer accepting new requests.'
                    );
                    try {
                        // 2. Close the database connection pool.
                        if (AppDataSource.isInitialized) {
                            await AppDataSource.destroy();
                            console.log('[Database] Database connection pool closed.');
                        }
                        console.log('[Server Shutdown] Graceful shutdown complete.');
                        process.exit(0); // Exit with a success code.
                    } catch (dbError) {
                        console.error(
                            '[Server Shutdown] ❌ Error closing database connection during shutdown:',
                            dbError
                        );
                        process.exit(1); // Exit with an error code.
                    }
                });

                // 3. Force exit after a timeout if graceful shutdown takes too long.
                // Prevents the process from hanging indefinitely if connections don't close.
                setTimeout(() => {
                    console.error(
                        '[Server Shutdown] ⚠️ Graceful shutdown timed out. Forcing exit.'
                    );
                    process.exit(1);
                }, 10000); // 10-second timeout. Adjust as needed.
            });
        });
    } catch (error) {
        // Catches errors specifically from the `AppDataSource.initialize()` step.
        console.error(
            '[Server Startup] ❌ Critical error during DataSource initialization:',
            error
        );
        // Log the full error details for debugging.
        console.error('Error Details:', error);
        process.exit(1); // Exit if database connection fails on startup.
    }
}

// --- Start the application ---
startServer();

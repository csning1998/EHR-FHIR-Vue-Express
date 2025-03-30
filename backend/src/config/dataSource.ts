// backend/src/config/dataSource.ts
import { DataSource, DataSourceOptions } from 'typeorm'
import config from '.' // Import the centralized application configuration
// Import all necessary Entity classes that TypeORM should manage.
import { PatientEntity } from '../models/entities/Patient.entity'
import { UserEntity } from '../models/entities/User.entity'

/**
 * @file dataSource.ts
 * @description Defines the TypeORM DataSource configuration options.
 * Reads database credentials and settings from the central `config` object,
 * which in turn reads from environment variables (.env file).
 * Specifies entities, logging behavior, and schema synchronization settings based on the environment.
 */

/**
 * @constant dataSourceOptions
 * @type {DataSourceOptions}
 * @description Configuration object passed to the TypeORM DataSource constructor.
 * @property {string} type - Database driver type (e.g., 'postgres'). Pulled from `config.db.type`.
 * @property {string} host - Database server hostname or IP address. Pulled from `config.db.host`.
 * @property {number} port - Database server port. Pulled from `config.db.port`.
 * @property {string | undefined} username - Database username. Pulled from `config.db.username`.
 * @property {string | undefined} password - Database password. Pulled from `config.db.password`.
 * @property {string | undefined} database - Name of the database to connect to. Pulled from `config.db.database`.
 *
 * @property {boolean} synchronize - **CRITICAL SETTING**:
 * - `true` (Development): TypeORM automatically creates/updates database schema based on Entity definitions on application start. Convenient for development but **DANGEROUS** in production as it can cause data loss.
 * - `false` (Production): Schema changes must be managed manually using TypeORM Migrations. This is the safe approach for production environments.
 * - Value is determined by `config.nodeEnv === 'development'`.
 *
 * @property {('query' | 'error' | 'schema' | ... )[] | boolean} logging - Controls TypeORM logging level.
 * - `['query', 'error']` (Development): Logs executed SQL queries and database errors to the console. Useful for debugging.
 * - `['error']` (Production): Logs only database errors. Avoids verbose query logging in production.
 * - Value is determined by `config.nodeEnv === 'development'`.
 *
 * @property {Function[]} entities - An array of Entity classes (e.g., `[PatientEntity, UserEntity]`). TypeORM uses these to understand your database structure and generate queries. Ensure all entities used in the application are listed here.
 *
 * @property {string[]} [migrations] - Optional: Path(s) to migration files. Essential for production schema management when `synchronize` is false. Example: `[__dirname + '/../database/migrations/*{.ts,.js}']`.
 * @property {Function[]} [subscribers] - Optional: Array of EntitySubscriber classes.
 * @property {object | boolean} [ssl] - Optional: SSL configuration for database connection (e.g., required for cloud databases). Example: `config.nodeEnv === 'production' ? { rejectUnauthorized: false } : false`.
 */
export const dataSourceOptions: DataSourceOptions = {
    type: config.db.type,
    host: config.db.host,
    port: config.db.port,
    username: config.db.username,
    password: config.db.password,
    database: config.db.database,

    // synchronize: Development convenience vs. Production safety.
    // Set based on NODE_ENV. NEVER use true in production.
    synchronize: false, // AFTER: Disable auto-sync

    // logging: Development verbosity vs. Production conciseness.
    logging: config.nodeEnv === 'development' ? ['query', 'error'] : ['error'],

    // entities: Explicitly list all entities TypeORM needs to manage.
    // Avoid using file path globbing here (e.g., 'src/models/entities/**/*.ts')
    // as it can be less reliable, especially after compilation to JavaScript.
    entities: [
        PatientEntity,
        UserEntity,
        // Add other entities here as they are created...
    ],

    // migrations: Define path if using TypeORM migrations (recommended for production).
    // migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

    // subscribers: Define path if using TypeORM subscribers.
    // subscribers: [],

    // Example SSL config - adjust based on your database provider requirements.
    // ssl: config.nodeEnv === 'production' ? { rejectUnauthorized: false } : undefined,
};

/**
 * @constant AppDataSource
 * @type {DataSource}
 * @description The TypeORM DataSource instance created with the `dataSourceOptions`.
 * This instance is initialized in `server.ts` and used throughout the application
 * (typically in services) to get Repositories for interacting with specific entities.
 * @example // In a service:
 * import { AppDataSource } from '../config/dataSource';
 * import { UserEntity } from '../models/entities/User.entity';
 * const userRepository = AppDataSource.getRepository(UserEntity);
 * const user = await userRepository.findOneBy({ id: 1 });
 */
export const AppDataSource: DataSource = new DataSource(dataSourceOptions);

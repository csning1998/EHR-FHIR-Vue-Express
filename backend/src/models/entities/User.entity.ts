// src/models/entities/User.entity.ts
import {
   BaseEntity,
   BeforeInsert,
   BeforeUpdate,
   Column,
   CreateDateColumn,
   Entity,
   Index,
   PrimaryGeneratedColumn,
   UpdateDateColumn
} from 'typeorm'
import * as bcrypt from 'bcrypt' // Library for hashing passwords securely.

/**
 * @class UserEntity
 * @extends BaseEntity
 * @description Represents the `users` table in the database. Maps object properties to table columns
 * using TypeORM decorators. Includes logic for automatic password hashing before saving.
 * @design Uses the Active Record pattern (via extending BaseEntity) for simpler save/remove operations,
 * although the Repository pattern (used in services) is generally preferred for better separation of concerns in larger applications.
 * Password hashing is handled via `@BeforeInsert`/`@BeforeUpdate` hooks within the entity itself, ensuring passwords
 * are always hashed before being persisted, regardless of how the entity is saved (directly or via repository).
 */
@Entity('users') // Maps this class to the 'users' table.
export class UserEntity extends BaseEntity {
    /**
     * @property id
     * @description The unique identifier for the user.
     * @decorator `@PrimaryGeneratedColumn` - Configures this as the primary key column. TypeORM handles auto-incrementing based on the database type (e.g., SERIAL/BIGSERIAL in PostgreSQL).
     */
    @PrimaryGeneratedColumn()
    id!: number; // `!` indicates that TypeORM will initialize this property.

    /**
     * @property email
     * @description The user's email address. Used for login and identification.
     * @decorator `@Index({ unique: true })` - Creates a unique index on the email column in the database, preventing duplicate emails.
     * @decorator `@Column({ length: 100 })` - Maps to a database column, specifying a maximum length.
     */
    @Index({ unique: true }) // Database-level uniqueness constraint.
    @Column({ length: 100, type: 'varchar' }) // Explicitly setting varchar and length.
    email!: string;

    /**
     * @property password
     * @description Stores the user's securely hashed password.
     * @decorator `@Column()` - Maps to a standard database column (TypeORM typically infers type `string` -> `varchar`).
     * @security **Never store plaintext passwords.** Hashing is handled by the `hashPassword` hook below.
     */
    @Column({ type: 'varchar', length: 255 }) // Ensure sufficient length for bcrypt hash (typically 60 chars, but provide buffer).
    password!: string;

    // --- Refresh Token Related Fields ---
    /**
     * @property refreshToken
     * @description Stores the user's currently active refresh token (or a hash of it). Nullable.
     * @decorator `@Column({ name: 'refresh_token', type: 'text', nullable: true })`
     * - `name`: Explicitly sets the database column name (snake_case convention).
     * - `type: 'text'`: Allows for potentially long token strings.
     * - `nullable: true`: Allows the field to be empty (e.g., when user is logged out).
     * @security Storing the raw token is less secure than storing a hash. If storing a hash, validation logic in AuthService needs adjustment.
     */
    @Column({ name: 'refresh_token', type: 'text', nullable: true })
    refreshToken?: string | null;

    /**
     * @property refreshTokenExpiresAt
     * @description Timestamp indicating when the stored refresh token expires. Nullable.
     * @decorator `@Column({ name: 'refresh_token_expires_at', type: 'timestamp with time zone', nullable: true })`
     * - `type: 'timestamp with time zone'`: Appropriate type for storing date/time with timezone information (TIMESTAMPTZ in Postgres).
     * - `nullable: true`: Allows the field to be empty.
     */
    @Column({ name: 'refresh_token_expires_at', type: 'timestamptz', nullable: true }) // Use timestamptz for PostgreSQL
    refreshTokenExpiresAt?: Date | null;
    // --- End Refresh Token ---

    /**
     * @property createdAt
     * @description Timestamp indicating when the user record was created.
     * @decorator `@CreateDateColumn({ name: 'created_at' })` - TypeORM automatically sets this field's value to the current timestamp upon entity creation (INSERT).
     * - `name`: Specifies the database column name.
     */
    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) // Ensure timestamptz
    createdAt!: Date;

    /**
     * @property updatedAt
     * @description Timestamp indicating when the user record was last updated.
     * @decorator `@UpdateDateColumn({ name: 'updated_at' })` - TypeORM automatically updates this field's value to the current timestamp whenever the entity is updated (UPDATE).
     * - `name`: Specifies the database column name.
     */
    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) // Ensure timestamptz
    updatedAt!: Date;

    // --- Hooks ---

    /**
     * @method hashPassword
     * @description TypeORM hook that automatically hashes the `password` property before inserting or updating the entity.
     * @decorator `@BeforeInsert()` - Ensures this method runs before an INSERT operation.
     * @decorator `@BeforeUpdate()` - Ensures this method runs before an UPDATE operation *if* the entity is being saved via `repository.save(entity)` or `entity.save()`. Note: It might not run for query builder updates (`update().set()`).
     * @logic Checks if the `password` property exists and appears to be plaintext (basic length check, <60 chars, as bcrypt hashes are longer). If so, it hashes the password using bcrypt.
     * @security This ensures passwords are never stored in plaintext. Uses a configurable salt round factor (defaulting to 10 here, ideally from `config`).
     * @returns {Promise<void>}
     */
    @BeforeInsert()
    @BeforeUpdate()
    async hashPassword(): Promise<void> {
        // Only hash if the password property is present and seems like plaintext.
        // This prevents re-hashing an already hashed password during updates where the password wasn't changed.
        // A more robust check might involve checking if it starts with '$2a$', '$2b$', etc.
        if (this.password && this.password.length < 60) {
            const saltRounds = 10; // TODO: Consider moving salt rounds to config file for easier management. e.g., config.security.saltRounds
            console.log(`[UserEntity Hook] Hashing password for user: ${this.email}`);
            this.password = await bcrypt.hash(this.password, saltRounds);
        }
    }

    // --- Deprecated / Moved Logic ---
    // @method comparePassword (Removed from Entity)
    // @description Compares a plaintext password attempt with the entity's stored hash.
    // @deprecated **This logic should reside in the AuthService, not the Entity.**
    // @rationale Entities should primarily represent data structure and persistence mapping.
    // Business logic like password comparison belongs in the service layer to maintain separation of concerns
    // and keep the entity focused on data representation.
    // async comparePassword(attempt: string): Promise<boolean> {
    //     // Logic moved to AuthService.validateUser
    //     return bcrypt.compare(attempt, this.password);
    // }
}

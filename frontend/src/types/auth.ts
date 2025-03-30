// src/types/auth.ts

// Type definitions for authentication-related data structures

/**
 * Interface for login request data.
 */
export interface LoginCredentials {
   email: string // User's email address
   password: string // User's password
}

/**
 * Interface for registration request data.
 */
export interface RegistrationInfo {
   email: string // User's email address
   password: string // User's password
   // Add other fields required for registration as needed
}

/**
 * Interface for user state used in the frontend, excluding sensitive information like password and refreshToken.
 */
export interface UserProfile {
   id: number // Unique identifier for the user
   email: string // User's email address
   // roles?: string[]; // Optional: User roles, if applicable
   createdAt: string // Creation timestamp (string or Date)
   updatedAt: string // Last update timestamp (string or Date)
   // Add other non-sensitive fields needed for frontend display
}

/**
 * Type alias for the Auth Store's state, representing either a user profile or null.
 */
export type UserState = UserProfile | null

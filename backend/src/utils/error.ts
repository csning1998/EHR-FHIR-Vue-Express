// src/utils/error.ts

/**
 * Base error class for application-specific errors (optional but promotes consistency).
 */
export class AppError extends Error {
   public statusCode: number
   public isOperational: boolean // Indicates whether this is an expected operational error

   /**
    * @param {string} name - The name of the error.
    * @param {number} statusCode - The HTTP status code associated with the error.
    * @param {string} message - The error message.
    * @param {boolean} [isOperational=true] - Whether the error is operational (default: true).
    */
   constructor(name: string, statusCode: number, message: string, isOperational = true) {
      super(message)
      this.name = name
      this.statusCode = statusCode
      this.isOperational = isOperational
      // Maintain proper stack trace (if supported in the target environment)
      if (Error.captureStackTrace) {
         Error.captureStackTrace(this, this.constructor)
      }
   }
}

export class NotFoundError extends AppError {
   /**
    * @param {string} [message='Resource not found'] - The error message.
    */
   constructor(message = 'Resource not found') {
      super('NotFoundError', 404, message)
   }
}

export class UnauthorizedError extends AppError {
   /**
    * @param {string} [message='Unauthorized operation'] - The error message.
    */
   constructor(message = 'Unauthorized operation') {
      super('UnauthorizedError', 401, message)
   }
}

export class ConflictError extends AppError {
   /**
    * @param {string} [message='Resource conflict occurred'] - The error message.
    */
   constructor(message = 'Resource conflict occurred') {
      super('ConflictError', 409, message)
   }
}

export class BadRequestError extends AppError {
   public errors?: any[] // Optional array of detailed validation errors

   /**
    * @param {string} [message='Invalid request format or data'] - The error message.
    * @param {any[]} [errors] - Optional array of detailed validation errors.
    */
   constructor(message = 'Invalid request format or data', errors?: any[]) {
      super('BadRequestError', 400, message)
      this.errors = errors // Optional detailed error information
   }
}

export class InternalServerError extends AppError {
   /**
    * @param {string} [message='Internal server error'] - The error message.
    */
   constructor(message = 'Internal server error') {
      // isOperational set to false, indicating this is not an expected business logic error
      super('InternalServerError', 500, message, false)
   }
}

// You can continue adding other error classes like ForbiddenError (403) as needed.

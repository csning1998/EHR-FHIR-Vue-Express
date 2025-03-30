// backend/.eslintrc.js

// ESLint configuration for TypeScript projects with Prettier integration
module.exports = {
    parser: '@typescript-eslint/parser', // Specifies the parser for TypeScript syntax
    extends: [
        'eslint:recommended', // Incorporates ESLint's recommended rules
        'plugin:@typescript-eslint/recommended', // Adds recommended rules from @typescript-eslint
        'plugin:prettier/recommended', // Enables Prettier integration and disables conflicting ESLint rules
    ],
    plugins: ['@typescript-eslint', 'prettier'], // Includes plugins for TypeScript and Prettier support
    env: {
        node: true, // Enables Node.js global variables and scoping
        es2021: true, // Supports ECMAScript 2021 syntax
    },
    parserOptions: {
        ecmaVersion: 'latest', // Uses the latest ECMAScript version
        sourceType: 'module', // Enables ES module syntax (import/export)
    },
    rules: {
        // Custom rules to enforce code quality and consistency
        'prettier/prettier': 'warn', // Reports Prettier formatting issues as warnings
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Warns on unused variables, ignoring those prefixed with underscore
        '@typescript-eslint/no-explicit-any': 'warn', // Allows 'any' type but issues a warning
        'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off', // Disables console.log in production, allows in development
    },
    ignorePatterns: ['node_modules/', 'dist/'], // Excludes node_modules and dist directories from linting
};
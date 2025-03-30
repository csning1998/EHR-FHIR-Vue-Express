// src/stores/authStore.ts
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import apiClient from '@/services/apiClient'
import router from '@/router' // Import router for navigation
import type { LoginCredentials, RegistrationInfo, UserState } from '@/types/auth' // <--- Added (assumes defined in src/types/auth.ts)

// Pinia store for managing authentication state and actions

// Defines the user state type for frontend use (excludes sensitive info)
// type UserState = Omit<UserEntity, 'password' | 'refreshToken' | 'refreshTokenExpiresAt'> | null;

export const useAuthStore = defineStore(
   'auth',
   () => {
      // --- State ---
      const user = ref<UserState>(null) // Initially null
      const loading = ref(false)
      const error = ref<string | null>(null)

      // --- Getters ---
      const isAuthenticated = computed(() => !!user.value) // Determines if user is authenticated based on presence

      // --- Actions ---

      /**
       * Clears the error state.
       */
      const clearError = () => {
         error.value = null
      }

      /**
       * Sets the user state and optionally persists non-sensitive data to sessionStorage.
       * @param {UserState} userData - The user data to set
       */
      const setUser = (userData: UserState) => {
         user.value = userData
         // Optional: Store non-sensitive info in sessionStorage for state restoration after refresh
         if (userData) {
            sessionStorage.setItem('user', JSON.stringify(userData))
         } else {
            sessionStorage.removeItem('user')
         }
      }

      /**
       * Checks authentication status on app initialization or refresh.
       * @returns {Promise<void>}
       */
      const checkAuthStatus = async (): Promise<void> => {
         console.log('[AuthStore] Checking auth status...')
         // 1. Attempt to restore user state from sessionStorage (if previously logged in)
         const storedUser = sessionStorage.getItem('user')
         if (storedUser) {
            try {
               user.value = JSON.parse(storedUser)
               console.log('[AuthStore] User restored from sessionStorage.')
            } catch {
               sessionStorage.removeItem('user')
            }
         }

         // 2. Verify cookie validity by calling /api/auth/me
         // This request auto-carries HttpOnly cookies; interceptor handles expired tokens
         try {
            loading.value = true
            const response = await apiClient.get('/auth/me') // Backend must provide this endpoint
            setUser(response.data) // Update user state
            console.log('[AuthStore] Auth status verified via /auth/me.')
         } catch (err: any) {
            console.log(
               '[AuthStore] Failed to verify auth status via /auth/me:',
               err.response?.data || err.message,
            )
            // If verification fails (401), ensure local state reflects logged-out
            if (err.response?.status === 401) {
               setUser(null) // Clear local user state
            } else {
               // Other errors (e.g., network issues)
               error.value = 'Unable to verify login status'
            }
         } finally {
            loading.value = false
         }
      }

      /**
       * Logs in a user with provided credentials.
       * @param {LoginCredentials} credentials - The login credentials
       * @returns {Promise<boolean>} Success status of login attempt
       */
      const loginAction = async (credentials: LoginCredentials): Promise<boolean> => {
         clearError()
         loading.value = true
         try {
            const response = await apiClient.post('/auth/login', credentials)
            setUser(response.data) // Backend should return user data (no password/token)
            console.log('[AuthStore] Login successful.')
            // Redirect to home or intended page after login
            const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
            await router.push(redirectPath)
            return true
         } catch (err: any) {
            console.error('[AuthStore] Login failed:', err.response?.data || err.message)
            error.value =
               err.response?.data?.message || 'Login failed. Please check your credentials.'
            setUser(null) // Ensure user is null on failure
            return false
         } finally {
            loading.value = false
         }
      }

      /**
       * Registers a new user.
       * @param {RegistrationInfo} userInfo - The registration information
       * @returns {Promise<boolean>} Success status of registration attempt
       */
      const registerAction = async (userInfo: RegistrationInfo): Promise<boolean> => {
         clearError()
         loading.value = true
         try {
            await apiClient.post('/auth/register', userInfo)
            console.log('[AuthStore] Registration successful.')
            // After registration, redirect to login page (or auto-login if backend supports)
            await router.push('/login')
            // Alternatively: await loginAction(userInfo); // If backend returns token on register
            return true
         } catch (err: any) {
            console.error('[AuthStore] Registration failed:', err.response?.data || err.message)
            error.value =
               err.response?.data?.message || 'Registration failed. Please try again later.'
            return false
         } finally {
            loading.value = false
         }
      }

      /**
       * @action logoutAction
       * @description Logs out the current user. It attempts to invalidate the session on the backend,
       * clears all authentication-related state on the frontend (Pinia state, sessionStorage),
       * and redirects the user to the **homepage**.
       * @returns {Promise<void>}
       */
      const logoutAction = async (): Promise<void> => {
         clearError() // Clear any existing auth errors.
         loading.value = true // Indicate logout process started.
         const currentUserId = user.value?.id // Capture user ID for logging before clearing state.
         console.log(
            `[AuthStore] Initiating logout process for user ID: ${currentUserId ?? 'Unknown'}`,
         )

         try {
            // Attempt to call backend logout endpoint. This primarily targets invalidating the refresh token on the server.
            // Check frontend state first to avoid unnecessary calls if already logged out locally.
            if (isAuthenticated.value || sessionStorage.getItem('user')) {
               console.log('[AuthStore] Calling backend /auth/logout endpoint...')
               await apiClient.post('/auth/logout')
               console.log(
                  '[AuthStore] Backend logout endpoint call completed (or failed silently).',
               )
            } else {
               console.log(
                  '[AuthStore] Skipping backend logout call as user is not authenticated locally.',
               )
            }
         } catch (err: any) {
            // Log backend logout errors, but proceed with frontend logout regardless.
            // Common reasons for failure include the token already being invalid on the server.
            console.error(
               '[AuthStore] Backend logout API call failed (this might be expected):',
               err.response?.data || err.message,
            )
            // Do not set `error.value` here; the goal is successful local logout.
         } finally {
            // --- Frontend State Cleanup (Always perform this) ---
            setUser(null) // Reset the reactive user state in Pinia to null.
            sessionStorage.removeItem('user') // Remove any persisted user data from sessionStorage.
            // Note: HttpOnly cookies ('accessToken', 'refreshToken') cannot be cleared directly via JS.
            // Clearing them relies on the browser session ending, cookie expiry, or the backend setting an expired cookie (which clearTokenCookies helper in controller does).
            // The primary effect here is resetting the frontend's knowledge of the user.

            loading.value = false // Reset loading flag.
            console.log('[AuthStore] Frontend authentication state cleared.')

            // --- Redirect to HOMEPAGE ('/') ---
            // Check if already on the target page to avoid redundant navigation errors/warnings.
            if (router.currentRoute.value.path !== '/') {
               console.log('[AuthStore] Redirecting to homepage (/).')
               // Use await to ensure navigation is attempted before function potentially exits.
               await router.push('/') // <--- MODIFIED: Redirect to homepage.
            } else {
               console.log('[AuthStore] Already on homepage, navigation skipped.')
            }
         }
      }

      /**
       * Refreshes the access token (called by axios interceptor).
       * @returns {Promise<void>}
       * @throws {any} Re-throws errors for interceptor to handle
       */
      const refreshTokenAction = async (): Promise<void> => {
         try {
            await apiClient.post('/auth/refresh') // Backend updates cookie on success
         } catch (error) {
            console.error('Error in refreshTokenAction:', error)
            // Let interceptor catch this error and handle logout
            throw error
         }
      }

      return {
         user,
         loading,
         error,
         isAuthenticated,
         loginAction,
         registerAction,
         logoutAction,
         checkAuthStatus,
         refreshTokenAction, // For interceptor use
         clearError,
      }
   },
   // Optional: Enable pinia-plugin-persistedstate if used
   // { persist: true }
)

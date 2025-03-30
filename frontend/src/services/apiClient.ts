// src/services/apiClient.ts
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '@/stores/authStore.ts' // Import Pinia auth store

/**
 * @file apiClient.ts
 * @description Configures and exports an Axios instance for interacting with the backend API.
 * Includes interceptors for handling request authorization (via HttpOnly cookies)
 * and automatic access token refresh logic upon encountering 401 Unauthorized errors.
 */

// --- Configuration ---

// Base URL for all API requests. Reads from Vite environment variable VITE_API_BASE_URL defined in `.env`.
// Falls back to a default development URL if the variable is not set.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3333/api'
// Log a warning during development if the .env variable is missing.
if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.MODE !== 'production') {
   console.warn(
      '[API Client] VITE_API_BASE_URL not set in .env file, defaulting to http://localhost:3333/api. Create a `.env` file in the frontend root.',
   )
}
console.log('[API Client] Initialized with Base URL:', API_BASE_URL)

/**
 * @constant apiClient
 * @description The configured Axios instance.
 * @config
 * - baseURL: Set from `API_BASE_URL`. All relative request paths will be appended to this.
 * - headers: Default headers for requests. 'Content-Type': 'application/json' is standard for REST APIs. Authorization header is NOT set here because we rely on HttpOnly cookies.
 * - timeout: Default request timeout (10 seconds). Prevents requests from hanging indefinitely.
 * - withCredentials: `true`. **CRITICAL** for sending cross-origin requests with cookies (like our HttpOnly accessToken and refreshToken). Without this, the browser will not send the cookies to the backend.
 */
const apiClient = axios.create({
   baseURL: API_BASE_URL,
   headers: {
      'Content-Type': 'application/json',
      // No 'Authorization' header needed here; tokens are handled by HttpOnly cookies.
   },
   timeout: 10000, // 10 seconds
   withCredentials: true, // Allows cookies to be sent with cross-origin requests. Essential for HttpOnly token strategy.
})

// --- Token Refresh Logic State ---

// Flag to prevent multiple concurrent refresh attempts if several API calls fail with 401 simultaneously.
let isRefreshing = false
// Queue to hold requests that failed due to 401 while a refresh was in progress.
// Each element is a promise resolver/rejecter pair.
let failedQueue: { resolve: (value?: any) => void; reject: (reason?: any) => void }[] = []

/**
 * @function processQueue
 * @description Processes all requests queued while token refresh was in progress.
 * If refresh succeeded, resolves queued promises (allowing retries).
 * If refresh failed, rejects queued promises with the refresh error.
 * @param {unknown} error - The error from the refresh attempt (null if successful).
 * @param {string | null} [token=null] - The new access token (not strictly needed for retries with HttpOnly cookies, but passed for consistency).
 */
const processQueue = (error: unknown, token: string | null = null) => {
   failedQueue.forEach((prom) => {
      if (error) {
         prom.reject(error) // Reject pending requests if refresh failed.
      } else {
         prom.resolve(token) // Resolve pending requests if refresh succeeded. They will be retried.
      }
   })
   // Clear the queue after processing.
   failedQueue = []
}

// --- Axios Response Interceptor ---

/**
 * @interceptor Axios Response Interceptor
 * @description Intercepts all responses from the API. Handles successful responses directly.
 * Intercepts errors, specifically looking for 401 Unauthorized errors to trigger
 * the access token refresh mechanism.
 * @logic
 * - On Success: Passes the response through.
 * - On Error:
 * 1. Logs the error details for debugging.
 * 2. Checks if the error is an AxiosError with a 401 status.
 * 3. Excludes specific endpoints from the refresh logic:
 * - `/auth/refresh`: Prevents infinite loops if the refresh endpoint itself returns 401.
 * - `/auth/logout`: Logout might intentionally return 401 if the token was already invalid; handle logout locally regardless.
 * 4. Checks `_retry` flag: Prevents retrying a request that already failed after a refresh attempt.
 * 5. Checks local auth state: If the frontend store indicates the user isn't logged in, don't attempt refresh (avoids unnecessary calls).
 * 6. Handles Concurrent Refreshes: If `isRefreshing` is true, queues the failed request.
 * 7. Initiates Refresh: If not already refreshing, sets `isRefreshing` flag, marks the original request with `_retry`, and calls the auth store's `refreshTokenAction`.
 * 8. Processes Queue: On successful refresh, processes the queue to resolve pending requests. Retries the original request (browser automatically includes the new cookie).
 * 9. Handles Refresh Failure: If `refreshTokenAction` fails, processes the queue to reject pending requests, forces logout via `authStore.logoutAction`, and rejects the promise.
 * 10. Resets `isRefreshing` flag in `finally` block.
 * 11. Handles 401 on Logout: Specifically processes 401s from the logout endpoint by ensuring local logout occurs, but resolves the promise to avoid breaking logout flows.
 * 12. Rethrows other errors (non-401, or 401s that shouldn't trigger refresh) to be handled by the calling code (e.g., Pinia store actions).
 */
apiClient.interceptors.response.use(
   (response) => response, // Pass through successful responses.
   async (error: AxiosError) => {
      // Type assertion for original request config to add our custom _retry flag.
      const originalRequest = error.config as InternalAxiosRequestConfig<any> & { _retry?: boolean }
      const authStore = useAuthStore() // Get auth store instance (Pinia setup ensures it's available).

      // Log detailed error information.
      console.error('[API Interceptor] API Call Error:', {
         message: error.message,
         url: originalRequest?.url,
         method: originalRequest?.method,
         status: error.response?.status,
         data: error.response?.data, // Backend error details if available.
      })

      // --- Condition to trigger token refresh ---
      // --- Token Refresh Logic ---
      if (
         error.response?.status === 401 &&
         originalRequest &&
         originalRequest.url !== '/auth/refresh' &&
         originalRequest.url !== '/auth/logout' && // Exclude logout from refresh attempt
         !originalRequest._retry
      ) {
         // Additional check: If the frontend doesn't think we're authenticated, don't bother refreshing.
         // This prevents refresh attempts after manual logout or if the initial state wasn't loaded correctly.
         if (!authStore.isAuthenticated && !sessionStorage.getItem('user')) {
            // Check store and sessionStorage as fallback
            console.warn(
               '[API Interceptor] 401 received, but not authenticated locally. Skipping refresh.',
            )
            // Decide whether to force logout or just reject. Rejecting is usually sufficient.
            // await authStore.logoutAction(); // This would trigger navigation, might not be desired here.
            return Promise.reject(error)
         }

         // --- Handle concurrent refresh attempts ---
         if (isRefreshing) {
            console.log(
               '[API Interceptor] Refresh already in progress. Queuing request:',
               originalRequest.url,
            )
            // If a refresh is already happening, queue this request.
            return new Promise((resolve, reject) => {
               failedQueue.push({ resolve, reject })
            })
               .then(() => {
                  // Once the refresh completes (successfully), retry the original request.
                  // The new accessToken cookie will be sent automatically by the browser due to `withCredentials: true`.
                  console.log(
                     '[API Interceptor] Retrying queued request after successful refresh:',
                     originalRequest.url,
                  )
                  return apiClient(originalRequest) // Retry the original request
               })
               .catch((err) => {
                  // If the refresh failed, the queue processor would have rejected this promise.
                  console.error(
                     '[API Interceptor] Queued request failed because refresh failed:',
                     originalRequest.url,
                  )
                  return Promise.reject(err) // Propagate the refresh error.
               })
         }

         // --- Initiate token refresh ---
         console.log('[API Interceptor] Access token expired or invalid. Initiating refresh...')
         isRefreshing = true // Set flag to block other concurrent refreshes.
         originalRequest._retry = true // Mark this request to prevent infinite retry loops.

         try {
            // Call the action in the auth store responsible for hitting the /auth/refresh endpoint.
            await authStore.refreshTokenAction()
            console.log('[API Interceptor] Token refresh successful.')

            // Process any queued requests that were waiting for this refresh.
            processQueue(null) // Pass null error indicating success.

            // Retry the original request that triggered the refresh.
            console.log('[API Interceptor] Retrying original request:', originalRequest.url)
            return apiClient(originalRequest) // Browser sends updated cookie.
         } catch (refreshError: any) {
            // --- Handle refresh failure ---
            console.error(
               '[API Interceptor] Token refresh failed:',
               refreshError?.response?.data || refreshError.message,
            )
            // Process the queue with the error, rejecting all pending requests.
            processQueue(refreshError)

            // Force logout on the frontend if refresh fails (invalidates user session).
            console.log('[API Interceptor] Forcing logout due to refresh failure.')
            await authStore.logoutAction() // This action should handle navigation.

            // Reject the original promise with the refresh error.
            return Promise.reject(refreshError)
         } finally {
            // Reset the refreshing flag regardless of success or failure.
            isRefreshing = false
         }
         // --- Special Handling for 401 on /auth/logout ---
      } else if (error.response?.status === 401 && originalRequest?.url === '/auth/logout') {
         // If the logout API call itself returns 401 (e.g., token was already missing/invalid),
         // we *don't* want to trigger the logout action again, as that causes a loop.
         // The original `logoutAction` call (the one that initiated this API request)
         // needs to proceed to its `finally` block to clear frontend state and redirect.
         console.warn(
            '[API Interceptor] Received 401 during logout request (token likely already invalid). Allowing original logout flow to complete locally.',
         )

         // *** FIX: Remove the recursive call to logoutAction ***
         // if (authStore.isAuthenticated || sessionStorage.getItem('user')) {
         //   await authStore.logoutAction(); // <--- REMOVE THIS LINE
         // }

         // Instead of calling logoutAction again, resolve the promise gracefully.
         // This allows the `await apiClient.post('/auth/logout')` in the *original*
         // logoutAction call to complete without throwing upwards, letting the `finally` block execute.
         return Promise.resolve({
            data: { message: 'Logout processed locally after 401 on logout endpoint.' },
         })
         // --- End Special Handling ---
      }

      // For all other errors (non-401, 401 from /refresh, retried 401s), re-throw the error
      // to be handled by the code that made the original API call (e.g., in the Pinia store action).
      return Promise.reject(error)
   },
)

export default apiClient

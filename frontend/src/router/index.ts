// src/router/index.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import HomeView from '@/views/HomeView.vue' // Eager-load HomeView as it's likely the entry point
import PatientFormView from '@/views/PatientFormView.vue' // Eager-load FormView as it's used for create/edit
import { useAuthStore } from '@/stores/authStore.ts' // Direct import for use within the guard

/**
 * @file router/index.ts
 * @description Configures the Vue Router for the application.
 * Defines application routes, navigation guards for authentication checks,
 * and history mode.
 */

// Define application routes using RouteRecordRaw type for strong typing.
const routes: Array<RouteRecordRaw> = [
   {
      path: '/',
      name: 'home', // Route names are useful for programmatic navigation (router.push({ name: 'home' }))
      component: HomeView, // Eagerly loaded - component is imported directly at the top. Good for initial/common views.
      // meta: No specific meta needed for the public home page in this setup.
   },
   {
      path: '/login',
      name: 'login',
      // Lazy-loaded component: Improves initial load time by only loading the component code when the route is visited.
      // The `() => import(...)` syntax enables code splitting via Vite/Webpack.
      component: () => import('@/views/LoginView.vue'),
      // Meta fields: Custom data associated with the route. Used here for access control logic.
      meta: { requiresGuest: true }, // Indicates this route should only be accessible to unauthenticated users.
   },
   {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'), // Lazy-loaded
      meta: { requiresGuest: true }, // Only for guests.
   },
   {
      path: '/patients',
      name: 'patient-list',
      component: () => import('@/views/PatientListView.vue'), // Lazy-loaded
      meta: { requiresAuth: true }, // Indicates this route requires the user to be authenticated.
   },
   {
      path: '/patients/new',
      name: 'patient-create',
      component: PatientFormView, // Eagerly loaded (shared with edit)
      meta: { requiresAuth: true }, // Requires authentication.
   },
   {
      path: '/patients/:id/edit', // Dynamic route segment ':id'. The value will be available as `route.params.id`.
      name: 'patient-edit',
      component: PatientFormView, // Reuses the same form component for editing.
      props: true, // Automatically passes route params (like ':id') as props to the component. Simplifies data fetching within the component.
      meta: { requiresAuth: true }, // Requires authentication.
   },
   // Catch-all route for 404 Not Found pages. MUST be the last route definition.
   {
      path: '/:pathMatch(.*)*', // Matches any path not previously matched.
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'), // Lazy-loaded
      // meta: No specific auth requirements for 404 page.
   },
]

/**
 * @constant router
 * @description The Vue Router instance.
 * @config
 * - history: `createWebHistory`. Uses the browser's History API for clean URLs (no hash '#'). Requires server-side configuration to handle page refreshes correctly (redirect all non-asset requests to index.html). `import.meta.env.BASE_URL` provides the base path configured in vite.config.ts.
 * - routes: The defined route configuration array.
 */
const router = createRouter({
   history: createWebHistory(import.meta.env.BASE_URL),
   routes,
})

// --- Global Navigation Guard ---

/**
 * @guard router.beforeEach
 * @description A global navigation guard executed before each route navigation.
 * It's the primary mechanism for enforcing authentication rules (requiresAuth, requiresGuest).
 * @param {RouteLocationNormalized} to - The target route object being navigated TO.
 * @param {RouteLocationNormalized} from - The current route object being navigated FROM.
 * @param {NavigationGuardNext} next - A function that MUST be called to resolve the hook.
 * - `next()`: Allow navigation.
 * - `next(false)`: Cancel navigation.
 * - `next('/path')` or `next({ name: 'route-name' })`: Redirect to a different route.
 * - `next(error)`: Cancel navigation and pass error to `router.onError`.
 * @returns {Promise<void>} The guard function is asynchronous because it might need to wait for auth state checks.
 * @logic
 * 1. Logs navigation attempts for debugging.
 * 2. Gets the auth store instance.
 * 3. **IMPORTANT**: It assumes `checkAuthStatus` is called ONCE during app initialization (e.g., in `App.vue`'s `onMounted` or `main.ts`). This avoids redundant checks on every navigation. It relies on the `authStore.isAuthenticated` getter which reflects the current state. If initial check isn't guaranteed elsewhere, uncommenting `await authStore.checkAuthStatus()` here might be needed, but less efficient.
 * 4. Checks `to.matched.some(...)` to see if any record in the matched route hierarchy has `requiresAuth` or `requiresGuest` meta flags.
 * 5. Uses the `isAuthenticated` getter from the auth store.
 * 6. **Decision Logic:**
 * - If route `requiresAuth` and user `is NOT authenticated`: Redirect to login, passing the intended destination (`to.fullPath`) as a query parameter (`redirect`) so the user can be sent there after successful login.
 * - If route `requiresGuest` and user `IS authenticated`: Redirect to the home page (or a dashboard). Prevents logged-in users from accessing login/register pages.
 * - Otherwise: Allow navigation using `next()`.
 */
router.beforeEach(async (to, from, next) => {
   console.log(`[Router Guard] Navigating from ${from.fullPath} to ${to.fullPath}...`)
   const authStore = useAuthStore()

   // --- Authentication State Check ---
   // Assumption: `checkAuthStatus` is called once when the app loads (e.g., in App.vue or main.ts).
   // We rely on the reactive `isAuthenticated` getter here. Avoid calling checkAuthStatus on every navigation.
   // if (authStore.user === null && !authStore.loading) {
   //   console.log('[Router Guard] User state is null, potentially needs initial check (ensure App.vue calls checkAuthStatus)');
   //   // If needed: await authStore.checkAuthStatus(); // Uncomment ONLY if initial check isn't guaranteed elsewhere.
   // }

   // Determine route requirements and user auth status
   const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
   const requiresGuest = to.matched.some((record) => record.meta.requiresGuest)
   const isAuthenticated = authStore.isAuthenticated // Use the reactive getter

   console.log(
      `[Router Guard] Route: ${String(to.name)}, requiresAuth: ${requiresAuth}, requiresGuest: ${requiresGuest}, isAuthenticated: ${isAuthenticated}`,
   )

   // --- Access Control Logic ---
   if (requiresAuth && !isAuthenticated) {
      // Redirect unauthenticated users trying to access protected routes to login.
      // Pass the original intended path as a query parameter for redirecting after login.
      console.log('[Router Guard] Access Denied (Auth Required). Redirecting to login.')
      next({ name: 'login', query: { redirect: to.fullPath } })
   } else if (requiresGuest && isAuthenticated) {
      // Redirect authenticated users trying to access guest-only routes (like login/register) to the home page.
      console.log('[Router Guard] Access Denied (Guest Required). Redirecting to home.')
      next({ name: 'home' })
   } else {
      // Allow navigation in all other cases (public routes, or authenticated users accessing protected routes).
      console.log('[Router Guard] Access Granted. Proceeding to route.')
      next()
   }
})

/**
 * @hook router.afterEach
 * @description A global navigation hook executed after each successful navigation or navigation failure.
 * Useful for logging or analytics.
 * @param {RouteLocationNormalized} to - The route navigated TO.
 * @param {RouteLocationNormalized} from - The route navigated FROM.
 * @param {NavigationFailure | undefined} failure - If navigation failed, contains error details. Otherwise undefined.
 */
router.afterEach((to, from, failure) => {
   if (failure) {
      // Log navigation failures for debugging.
      console.error('[Router Guard] Navigation failed:', failure)
   } else {
      // Log successful navigations.
      console.log(`[Router Guard] Successfully navigated to ${to.fullPath}`)
   }
})

/**
 * @hook router.onError
 * @description Handles errors that occur during route resolution or within navigation guards.
 * @param {Error} error - The error object.
 */
router.onError((error) => {
   console.error('[Router Guard] Uncaught Router error:', error)
   // Potentially redirect to a generic error page or display a notification.
})

export default router

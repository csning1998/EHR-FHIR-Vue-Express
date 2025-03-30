// src/main.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router' // Import router instance
import vuetify from './plugins/vuetify'
import { useAuthStore } from './stores/authStore' // Import the auth store

/**
 * @function initializeApp
 * @description Asynchronously initializes the Vue application.
 * Crucially, it ensures the authentication status is checked *before*
 * the application is mounted and routing begins. This prevents the router guard
 * from redirecting to login prematurely on page refresh when a valid session exists.
 */
async function initializeApp() {
   // 1. Create the root Vue application instance.
   const app = createApp(App)

   // 2. Create and install Pinia for state management.
   const pinia = createPinia()
   app.use(pinia)

   // --- Critical Authentication Check ---
   // 3. Obtain the auth store instance *after* Pinia is installed.
   const authStore = useAuthStore()

   console.log('[main.ts] Initializing app, attempting to check auth status...')
   try {
      // 4. Call and wait for the initial authentication check to complete.
      // This action attempts to verify the user's session using the HttpOnly cookie via the /api/auth/me endpoint.
      // It updates the authStore's state (user, isAuthenticated) accordingly.
      await authStore.checkAuthStatus()
      console.log(
         `[main.ts] Initial auth check completed. isAuthenticated: ${authStore.isAuthenticated}`,
      )
   } catch (error) {
      // Log errors during the initial check, but usually allow the app to continue loading (it will likely end up on the login page if auth failed).
      console.error('[main.ts] Error during initial auth status check:', error)
   }
   // --- End Critical Authentication Check ---

   // 5. Install the router *after* the initial auth check has been attempted.
   // Now, when the router's beforeEach guard runs for the first time,
   // the authStore.isAuthenticated state should reflect the result of checkAuthStatus.
   app.use(router)

   // 6. Install other plugins like Vuetify.
   app.use(vuetify)

   // 7. Mount the application to the DOM.
   app.mount('#app')
   console.log('[main.ts] Vue app mounted.')
}

// Execute the asynchronous initialization function.
initializeApp()

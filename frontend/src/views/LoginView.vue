<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router' // useRoute for retrieving redirect parameters
import { useAuthStore } from '@/stores/authStore'
import type { LoginCredentials } from '@/types/auth' // <--- Adjusted import path and type name

// Login view component for user authentication

// --- Refs for form inputs ---
const email = ref('')
const password = ref('')
const showPassword = ref(false) // Controls password visibility
const formValid = ref(false) // Vuetify form validation state
const form = ref<HTMLFormElement | null>(null) // Ref for Vuetify form (manual validation optional)

// --- Vuetify Rules (Examples) ---
const rules = {
   required: (value: string) => !!value || 'This field is required',
   email: (value: string) => /.+@.+\..+/.test(value) || 'Invalid email format',
   minLength: (v: string, len: number) =>
      (v && v.length >= len) || `Minimum ${len} characters required`,
}

// --- Pinia Store and Router ---
const authStore = useAuthStore()
const router = useRouter()
const route = useRoute() // Access current route information

// --- Computed properties for store state ---
const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

// --- Methods ---

/**
 * Handles the login submission process with form validation.
 * Redirects on success using authStore's internal logic or manually if needed.
 */
const handleLogin = async () => {
   // Optionally trigger Vuetify form validation manually
   const { valid } = await form.value?.validate()
   if (!valid || !formValid.value) return // Check Vuetify validation state

   // Basic frontend validation (could rely solely on Vuetify rules)
   if (!email.value || !password.value) {
      authStore.$patch({ error: 'Please enter both email and password' }) // Update store error directly
      return
   }

   authStore.clearError() // Clear previous error messages

   const credentials: LoginCredentials = {
      email: email.value,
      password: password.value,
   }

   const success = await authStore.loginAction(credentials)

   // On success, authStore.loginAction handles redirection internally
   if (success) {
      const redirectPath = (route.query.redirect as string) || '/'
      await router.push(redirectPath)
   }
}

/**
 * Clears error message when user starts typing.
 */
const onInput = () => {
   if (errorMessage.value) {
      authStore.clearError()
   }
}
</script>

<template>
   <v-container class="fill-height" fluid>
      <v-row align="center" justify="center">
         <v-col cols="12" lg="4" md="6" sm="8">
            <v-card :loading="isLoading" class="elevation-12">
               <v-toolbar color="primary" dark flat>
                  <v-toolbar-title>EHR System Login</v-toolbar-title>
               </v-toolbar>

               <v-card-text>
                  <v-alert
                     v-if="errorMessage"
                     class="mb-4"
                     closable
                     dense
                     type="error"
                     @click:close="authStore.clearError()"
                  >
                     {{ errorMessage }}
                  </v-alert>

                  <v-form ref="form" v-model="formValid" @submit.prevent="handleLogin">
                     <v-text-field
                        v-model="email"
                        :disabled="isLoading"
                        :rules="[rules.required, rules.email]"
                        class="mb-3"
                        label="Email"
                        name="email"
                        prepend-icon="mdi-email"
                        required
                        type="email"
                        @input="onInput"
                     ></v-text-field>

                     <v-text-field
                        v-model="password"
                        :append-inner-icon="showPassword ? 'mdi-eye-off' : 'mdi-eye'"
                        :disabled="isLoading"
                        :rules="[rules.required]"
                        :type="showPassword ? 'text' : 'password'"
                        class="mb-3"
                        label="Password"
                        name="password"
                        prepend-icon="mdi-lock"
                        required
                        @input="onInput"
                        @click:append-inner="showPassword = !showPassword"
                     ></v-text-field>

                     <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                           :disabled="!formValid || isLoading"
                           :loading="isLoading"
                           block
                           color="primary"
                           type="submit"
                        >
                           Login
                        </v-btn>
                     </v-card-actions>
                  </v-form>
                  <v-divider class="my-3"></v-divider>
                  <div class="text-center">
                     Don't have an account?
                     <router-link :to="{ name: 'register' }" class="text-decoration-none">
                        Register here
                     </router-link>
                  </div>
               </v-card-text>
            </v-card>
         </v-col>
      </v-row>
   </v-container>
</template>

<style scoped>
.fill-height {
   min-height: 80vh;
}
</style>

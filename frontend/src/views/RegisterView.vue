<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/authStore'
import type { RegistrationInfo } from '@/types/auth' // Import frontend-defined type

// Registration view component for creating new user accounts

// --- Refs for form inputs ---
const email = ref('')
const password = ref('')
const confirmPassword = ref('') // Password confirmation
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const formValid = ref(false)
// const form = ref<HTMLFormElement | null>(null); // Uncomment if form ref is needed

// --- Pinia Store and Router ---
const authStore = useAuthStore()
const router = useRouter()

// --- Computed properties ---
const isLoading = computed(() => authStore.loading)
const errorMessage = computed(() => authStore.error)

// --- Vuetify Rules (Examples) ---
const rules = {
   required: (value: string) => !!value || 'This field is required',
   email: (value: string) => /.+@.+\..+/.test(value) || 'Invalid email format',
   minLength: (v: string, len: number) =>
      (v && v.length >= len) || `Minimum ${len} characters required`,
   passwordMatch: (value: string) => value === password.value || 'Passwords do not match',
}

// --- Methods ---

/**
 * Handles the registration submission process with form validation.
 * On success, relies on authStore.registerAction for redirection.
 */
const handleRegister = async () => {
   // Optionally recheck formValid or trigger form.value?.validate() here
   if (!formValid.value) {
      // Could skip custom error if relying on Vuetify rules
      // authStore.$patch({ error: 'Please check input fields' });
      return
   }

   authStore.clearError()

   const userInfo: RegistrationInfo = {
      email: email.value,
      password: password.value,
   }

   const success = await authStore.registerAction(userInfo)

   // On success, authStore.registerAction handles redirect to login page
   if (success) {
      // Typically show success message and redirect to login
      await router.push('/login')
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
               <v-toolbar color="secondary" dark flat>
                  <v-toolbar-title>Create New Account</v-toolbar-title>
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

                  <v-form v-model="formValid" @submit.prevent="handleRegister">
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
                        :rules="[rules.required, rules.minLength(password, 8)]"
                        :type="showPassword ? 'text' : 'password'"
                        class="mb-3"
                        counter
                        hint="At least 8 characters"
                        label="Password"
                        name="password"
                        prepend-icon="mdi-lock"
                        required
                        @input="onInput"
                        @click:append-inner="showPassword = !showPassword"
                     ></v-text-field>

                     <v-text-field
                        v-model="confirmPassword"
                        :append-inner-icon="showConfirmPassword ? 'mdi-eye-off' : 'mdi-eye'"
                        :disabled="isLoading"
                        :rules="[rules.required, rules.passwordMatch]"
                        :type="showConfirmPassword ? 'text' : 'password'"
                        class="mb-3"
                        label="Confirm Password"
                        name="confirmPassword"
                        prepend-icon="mdi-lock-check"
                        required
                        @input="onInput"
                        @click:append-inner="showConfirmPassword = !showConfirmPassword"
                     ></v-text-field>

                     <v-card-actions>
                        <v-spacer></v-spacer>
                        <v-btn
                           :disabled="!formValid || isLoading"
                           :loading="isLoading"
                           block
                           color="secondary"
                           type="submit"
                        >
                           Register
                        </v-btn>
                     </v-card-actions>
                  </v-form>
                  <v-divider class="my-3"></v-divider>
                  <div class="text-center">
                     Already have an account?
                     <router-link :to="{ name: 'login' }" class="text-decoration-none">
                        Login here
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

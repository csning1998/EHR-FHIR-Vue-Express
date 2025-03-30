<script lang="ts" setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientStore } from '@/stores/patientStore' // <--- Import Store
import { storeToRefs } from 'pinia' // <--- Import storeToRefs
import type { VForm } from 'vuetify/components'
import type { NewPatient, Patient } from '@/types/patient'

// Patient form component for creating or editing patient data

// --- Router and Props ---
const router = useRouter()
const props = defineProps<{
   id?: string // From route param /:id (passed as prop due to props: true in router)
}>()

// Store instance and reactive state
const patientStore = usePatientStore()
// Destructure required state from Store, maintaining reactivity
const { currentPatient, loadingDetail, submittingForm, error } = storeToRefs(patientStore)

// --- Component Local State ---
const form = ref<VForm | null>(null)
// Form data is primarily managed by store.currentPatient, but a local copy is used for editing
// Here, we use a local formData ref and sync it with the store on load/clear
const formData = ref<NewPatient | Patient>({
   // Initial values correspond to NewPatient
   pid: '',
   active: true, // Default to true
   familyName: '',
   givenName: '',
   telecom: '',
   gender: 'Others', // Default value
   birthday: '', // YYYY-MM-DD
   address: '',
   email: '', // Optional fields initialized as empty string or undefined/null
   postalCode: '',
   country: '',
   preferredLanguage: '',
   emergencyContactName: '',
   emergencyContactRelationship: '',
   emergencyContactPhone: '',
})

// --- Computed Properties ---
const isEditing = computed(() => !!props.id)
const patientId = computed(() => (props.id ? parseInt(props.id, 10) : undefined))
const formTitle = computed(() =>
   isEditing.value ? `Edit Patient (ID: ${patientId.value})` : 'Add Patient',
)

// --- Validation Rules ---
const pidRules = [
   (v: string) => !!v || 'ID Number (PID) is required',
   (v: string) => (v && v.length === 10) || 'ID Number must be 10 digits',
   // Additional format validation can be added
]
const familyNameRules = [(v: string) => !!v || 'Family Name is required']
const givenNameRules = [(v: string) => !!v || 'Given Name is required']
const telecomRules = [(v: string) => !!v || 'Phone Number is required']
const birthdayRules = [(v: string) => !!v || 'Birthday is required']
const addressRules = [(v: string) => !!v || 'Address is required']
const emailRules = [
   // Email is optional, but validate format if provided
   (v: string | null | undefined) => !v || /.+@.+\..+/.test(v) || 'Invalid email format',
]

// --- Form Initialization Logic ---

/**
 * Initializes the form state based on edit or create mode.
 * Loads patient data in edit mode or resets for create mode.
 */
const initializeForm = async () => {
   patientStore.clearError() // Clear any residual errors in Store
   await nextTick() // Wait for DOM update to ensure form ref is available
   form.value?.resetValidation() // Reset form validation state

   if (isEditing.value && patientId.value) {
      // Edit mode: Trigger Store Action to load data
      // loadingDetail state will reflect from Store
      await patientStore.fetchPatientByIdAction(patientId.value)
      // Watch currentPatient changes to populate formData (see watch below)
   } else {
      // Create mode: Clear Store's currentPatient and reset local formData
      patientStore.clearCurrentPatient()
   }
}

// --- Watch Store's currentPatient Changes ---
// Updates local formData when store.currentPatient changes (e.g., after fetch)
watch(
   currentPatient,
   (newVal) => {
      if (isEditing.value && newVal) {
         // Update local form model with fetched data
         formData.value = { ...newVal }
         // Optionally reset validation to avoid stale error messages
         nextTick(() => {
            form.value?.resetValidation()
         })
      }
   },
   { deep: true }, // Deep watch for nested object changes
)

// Load data on mount or when ID changes
onMounted(initializeForm)
watch(() => props.id, initializeForm) // Watch for props.id changes

// --- Form Submission Logic ---

/**
 * Saves the patient data by validating and submitting to Store actions.
 * Redirects to patient list on success.
 */
const savePatient = async () => {
   if (!form.value) return

   const { valid } = await form.value.validate()

   if (valid) {
      let success = false
      // Submit data from local formData to Store Action
      if (isEditing.value && patientId.value) {
         // Explicitly build update payload with correct id type
         const payload: Patient = {
            ...formData.value, // Spread current form values
            id: patientId.value, // Use computed prop for explicit number-typed id
         }
         console.log('Update payload:', payload) // Optional: Log for debugging
         success = await patientStore.updatePatientAction(payload)
      } else {
         success = await patientStore.createPatientAction(formData.value as NewPatient)
      }

      if (success) {
         console.log('Save successful (via Store Action).')
         // Redirect to patient list page
         await router.push({ name: 'patient-list' })
      } else {
         console.log('Save failed (via Store Action).')
         // Error message is in store.error, displayed in template
      }
   } else {
      console.log('Form validation failed.')
   }
}

// --- Cancel Action ---

/**
 * Cancels the form operation and redirects to patient list.
 */
const cancel = () => {
   patientStore.clearCurrentPatient() // Clear Store state
   router.push({ name: 'patient-list' })
}
</script>

<template>
   <v-alert
      v-if="error"
      class="mb-4"
      closable
      density="compact"
      type="error"
      @click:close="patientStore.clearError()"
   >
      {{ error }}
   </v-alert>

   <v-card :loading="loadingDetail || submittingForm" flat>
      <v-card-title class="text-h5 pa-4">{{ formTitle }}</v-card-title>
      <v-divider></v-divider>

      <v-skeleton-loader v-if="loadingDetail" type="article, actions"></v-skeleton-loader>

      <v-form v-else ref="form" @submit.prevent="savePatient">
         <v-card-text>
            <v-container>
               <v-row>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.pid"
                        :disabled="submittingForm || loadingDetail"
                        :rules="pidRules"
                        counter="10"
                        label="ID Number (PID)"
                        maxlength="10"
                        required
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-checkbox
                        v-model="formData.active"
                        :disabled="submittingForm || loadingDetail"
                        label="Active Status"
                     ></v-checkbox>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.familyName"
                        :disabled="submittingForm || loadingDetail"
                        :rules="familyNameRules"
                        label="Family Name"
                        required
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.givenName"
                        :disabled="submittingForm || loadingDetail"
                        :rules="givenNameRules"
                        label="Given Name"
                        required
                        variant="outlined"
                     ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.telecom"
                        :disabled="submittingForm || loadingDetail"
                        :rules="telecomRules"
                        label="Phone Number (Telecom)"
                        required
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-radio-group
                        v-model="formData.gender"
                        :disabled="submittingForm || loadingDetail"
                        inline
                        label="Gender"
                        required
                     >
                        <v-radio label="Male" value="男"></v-radio>
                        <v-radio label="Female" value="女"></v-radio>
                        <v-radio label="Other" value="其他"></v-radio>
                     </v-radio-group>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.birthday"
                        :disabled="submittingForm || loadingDetail"
                        :rules="birthdayRules"
                        label="Birthday"
                        required
                        type="date"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12">
                     <v-text-field
                        v-model="formData.address"
                        :disabled="submittingForm || loadingDetail"
                        :rules="addressRules"
                        label="Address"
                        required
                        variant="outlined"
                     ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.email"
                        :disabled="submittingForm || loadingDetail"
                        :rules="emailRules"
                        label="Email"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.postalCode"
                        :disabled="submittingForm || loadingDetail"
                        label="Postal Code"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.country"
                        :disabled="submittingForm || loadingDetail"
                        label="Country"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.preferredLanguage"
                        :disabled="submittingForm || loadingDetail"
                        label="Preferred Language"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>

                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.emergencyContactName"
                        :disabled="submittingForm || loadingDetail"
                        label="Emergency Contact Name"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.emergencyContactRelationship"
                        :disabled="submittingForm || loadingDetail"
                        label="Emergency Contact Relationship"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
                  <v-col cols="12" md="6">
                     <v-text-field
                        v-model="formData.emergencyContactPhone"
                        :disabled="submittingForm || loadingDetail"
                        label="Emergency Contact Phone"
                        variant="outlined"
                     ></v-text-field>
                  </v-col>
               </v-row>
            </v-container>
         </v-card-text>

         <v-card-actions class="pa-4">
            <v-spacer></v-spacer>
            <v-btn :disabled="submittingForm" color="grey" variant="text" @click="cancel"
               >Cancel
            </v-btn>
            <v-btn
               :disabled="loadingDetail"
               :loading="submittingForm"
               color="primary"
               type="submit"
               variant="elevated"
            >
               <v-icon start>mdi-content-save</v-icon>
               Save
            </v-btn>
         </v-card-actions>
      </v-form>
   </v-card>
</template>

<style scoped>
/* Add specific styles if needed */
</style>

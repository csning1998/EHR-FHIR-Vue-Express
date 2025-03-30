<script lang="ts" setup>
import { computed, ref, watch } from 'vue'
import { usePatientStore } from '@/stores/patientStore'

// Component to display patient details in a dialog with FHIR integration

// --- Props ---
// Uses v-model to control dialog visibility
const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits(['update:modelValue'])

// --- Store ---
const patientStore = usePatientStore()

// --- Computed Properties ---
const dialogVisible = computed({
   get: () => props.modelValue,
   set: (value) => emit('update:modelValue', value),
})
const patient = computed(() => patientStore.currentPatient) // Retrieves current patient data from store
const isLoadingDetail = computed(() => patientStore.loadingDetail)
const fetchError = computed(() => patientStore.error) // Error from fetching patient details
const isPushing = computed(() => patientStore.isPushingToFhir)
const pushError = computed(() => patientStore.fhirPushError)
const pushSuccessMessage = computed(() => patientStore.fhirPushSuccessMessage)

// --- Added: FHIR JSON-Related Computed Properties ---
const fhirData = computed(() => patientStore.fhirJsonData)
const isLoadingFhirJson = computed(() => patientStore.loadingFhirJson)
const fhirError = computed(() => patientStore.fhirJsonError)

// --- State for Expansion Panel ---
const fhirPanel = ref<number[]>([]) // Controls which panels are open (array-based)

// --- Methods ---

/**
 * Initiates pushing patient data to the FHIR server.
 * Clears success message after 3 seconds if successful.
 */
const handlePushToFhir = async () => {
   if (patient.value?.id) {
      await patientStore.pushToFhirAction(patient.value.id)
      // Success or failure reflected via computed properties (pushError, pushSuccessMessage)
      // Optionally auto-clear success message after a delay
      if (pushSuccessMessage.value) {
         setTimeout(() => {
            patientStore.clearFhirPushStatus()
         }, 3000) // Clears success message after 3 seconds
      }
   }
}

/**
 * Closes the dialog and resets related store states.
 */
const closeDialog = () => {
   dialogVisible.value = false
   // Optional: Clear currentPatient on close to avoid stale data on reopen
   // patientStore.clearCurrentPatient();
   patientStore.clearFhirPushStatus() // Reset FHIR push status
   patientStore.clearError() // Clear any lingering fetch errors
}

// --- Watcher: Triggers FHIR JSON fetch when panel opens ---
watch(fhirPanel, (newVal, oldVal) => {
   // Assumes panel value 0 represents the FHIR panel
   const panelIndex = 0
   const isPanelOpen = newVal.includes(panelIndex)
   const wasPanelOpen = oldVal.includes(panelIndex)

   // Fetch only when panel opens, not loading, no errors, and no data exists
   if (
      isPanelOpen &&
      !wasPanelOpen &&
      !isLoadingFhirJson.value &&
      !fhirError.value &&
      !fhirData.value
   ) {
      if (patient.value?.id) {
         console.log('FHIR Panel opened, fetching FHIR JSON...')
         patientStore.fetchFhirJsonAction(patient.value.id)
      }
   }
})

// --- Watcher: Clears FHIR JSON state when dialog opens ---
watch(
   () => props.modelValue,
   (isVisible) => {
      if (isVisible) {
         patientStore.clearFhirJsonStatus()
         fhirPanel.value = [] // Collapse panel
      }
   },
)
</script>

<template>
   <v-dialog v-model="dialogVisible" max-width="800px" persistent scrollable>
      <v-card :loading="isLoadingDetail || isPushing">
         <v-card-title>
            <span class="headline">Patient Details</span>
            <v-spacer></v-spacer>
            <v-btn icon="mdi-close" variant="text" @click="closeDialog"></v-btn>
         </v-card-title>

         <v-divider></v-divider>

         <v-card-text style="max-height: 60vh">
            <v-container v-if="isLoadingDetail">
               <v-row justify="center">
                  <v-progress-circular color="primary" indeterminate></v-progress-circular>
               </v-row>
            </v-container>
            <v-alert v-else-if="fetchError" type="error">
               Failed to load patient data: {{ fetchError }}
            </v-alert>
            <v-container v-else-if="patient">
               <v-row dense>
                  <v-col cols="12" sm="6"><strong>ID:</strong> {{ patient.id }}</v-col>
                  <v-col cols="12" sm="6"><strong>PID:</strong> {{ patient.pid }}</v-col>
                  <v-col cols="12" sm="6"
                     ><strong>Name:</strong> {{ patient.familyName }}{{ patient.givenName }}
                  </v-col>
                  <v-col cols="12" sm="6"><strong>Gender:</strong> {{ patient.gender }}</v-col>
                  <v-col cols="12" sm="6"><strong>Birthday:</strong> {{ patient.birthday }}</v-col>
                  <v-col cols="12" sm="6"><strong>Phone:</strong> {{ patient.telecom }}</v-col>
                  <v-col cols="12" sm="6"
                     ><strong>Email:</strong> {{ patient.email || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="6"
                     ><strong>Status:</strong> {{ patient.active ? 'Active' : 'Inactive' }}
                  </v-col>
                  <v-col cols="12"><strong>Address:</strong> {{ patient.address || 'N/A' }}</v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Postal Code:</strong> {{ patient.postalCode || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Country:</strong> {{ patient.country || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Preferred Language:</strong> {{ patient.preferredLanguage || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Emergency Contact:</strong>
                     {{ patient.emergencyContactName || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Relationship:</strong>
                     {{ patient.emergencyContactRelationship || 'N/A' }}
                  </v-col>
                  <v-col cols="12" sm="4"
                     ><strong>Emergency Phone:</strong>
                     {{ patient.emergencyContactPhone || 'N/A' }}
                  </v-col>
               </v-row>
            </v-container>
            <v-alert v-else type="warning"> No patient data found.</v-alert>

            <v-alert v-if="pushSuccessMessage" class="mt-4" dense type="success">
               {{ pushSuccessMessage }}
            </v-alert>
            <v-alert v-if="pushError" class="mt-4" dense type="error">
               FHIR Push Failed: {{ pushError }}
            </v-alert>
         </v-card-text>

         <v-divider></v-divider>

         <v-expansion-panels v-model="fhirPanel" multiple>
            <v-expansion-panel :value="0">
               <v-expansion-panel-title color="grey-lighten-3">
                  <v-icon start>mdi-code-json</v-icon>
                  FHIR JSON Format
               </v-expansion-panel-title>
               <v-expansion-panel-text>
                  <v-progress-circular
                     v-if="isLoadingFhirJson"
                     class="d-block mx-auto my-4"
                     color="primary"
                     indeterminate
                  ></v-progress-circular>
                  <v-alert v-else-if="fhirError" dense type="error">
                     Failed to load FHIR JSON: {{ fhirError }}
                  </v-alert>
                  <pre
                     v-else-if="fhirData"
                     style="
                        white-space: pre-wrap;
                        word-wrap: break-word;
                        background-color: #f5f5f5;
                        padding: 10px;
                        border-radius: 4px;
                     "
                     >{{ JSON.stringify(fhirData, null, 2) }}</pre
                  >
                  <v-alert v-else dense type="info">
                     Click the title to load FHIR JSON data.
                  </v-alert>
               </v-expansion-panel-text>
            </v-expansion-panel>
         </v-expansion-panels>

         <v-divider></v-divider>

         <v-card-actions>
            <v-spacer></v-spacer>
            <v-btn :disabled="isPushing" color="blue-darken-1" variant="text" @click="closeDialog">
               Close
            </v-btn>
            <v-btn
               :disabled="isLoadingDetail || !patient || isPushing"
               :loading="isPushing"
               color="primary"
               variant="elevated"
               @click="handlePushToFhir"
            >
               <v-icon start>mdi-upload</v-icon>
               Push to FHIR Server
            </v-btn>
         </v-card-actions>
      </v-card>
   </v-dialog>
</template>

<style scoped>
/* Optional styles */
.headline {
   font-weight: bold;
}
</style>

<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { usePatientStore } from '@/stores/patientStore' // <--- Import Store
import PatientDetailModal from '@/components/PatientDetailModal.vue' // <--- Import modal component
import type { Patient } from '@/types/patient' // <--- Import Patient type

// Patient list view component for displaying and managing patient records

type DataTableHeader = {
   title: string
   key: string // Maps to data item property
   value?: string // Sometimes used instead of key, depending on Vuetify version
   align?: 'start' | 'end' | 'center' // Explicitly typed align options
   sortable?: boolean
   width?: string | number
   // Additional Vuetify VDataTable Header properties can be added as needed
}

const router = useRouter()
const patientStore = usePatientStore() // <--- Use Store

// --- State for Modal ---
const isDetailModalVisible = ref(false)
const selectedPatientId = ref<number | null>(null)

// --- Computed properties from store ---
const patients = computed(() => patientStore.patients)
const isLoading = computed(() => patientStore.loadingList)
const storeError = computed(() => patientStore.error)

// Table headers definition
const headers = ref<DataTableHeader[]>([
   { title: 'ID', key: 'id', align: 'start', width: '80px' },
   { title: 'ID Number (PID)', key: 'pid', align: 'start', width: '120px' }, // Added PID
   { title: 'Family Name', key: 'familyName', align: 'start' }, // Added
   { title: 'Given Name', key: 'givenName', align: 'start' }, // Added
   { title: 'Gender', key: 'gender', align: 'start', width: '80px' },
   { title: 'Birthday', key: 'birthday', align: 'start' },
   { title: 'Phone (Telecom)', key: 'telecom', align: 'start' }, // Added
   { title: 'Status (Active)', key: 'active', align: 'center', width: '80px' }, // Added Active
   { title: 'Actions', key: 'actions', align: 'center', sortable: false, width: '120px' },
])

// --- Methods ---

/**
 * Navigates to the patient creation page.
 */
const goToCreate = () => {
   router.push({ name: 'patient-create' })
}

/**
 * Navigates to the patient edit page for the specified ID.
 * @param {number} id - The patient's ID
 */
const goToEdit = (id: number) => {
   router.push({ name: 'patient-edit', params: { id } })
}

const confirmDelete = async (id: number) => {
   if (confirm(`Are you sure you want to delete patient ID: ${id}?`)) {
      const success = await patientStore.deletePatientAction(id)
      if (success) {
         console.log(`Patient ${id} deleted successfully.`)
         // Optionally display success message (e.g., via Snackbar)
      } else {
         console.error(`Failed to delete patient ${id}. Error: ${patientStore.error}`)
         // Optionally display error message
      }
   }
}

const openDetailModal = async (patient: Patient) => {
   if (!patient.id) return
   selectedPatientId.value = patient.id // Store the ID
   patientStore.clearError() // Clear any residual list errors
   patientStore.clearFhirPushStatus() // Clear previous modal FHIR status
   // Fetch latest data (even if list has it, details might be more complete)
   await patientStore.fetchPatientByIdAction(patient.id)
   isDetailModalVisible.value = true // Open the modal
}

// --- Fetch patients on component mount ---
onMounted(() => {
   patientStore.fetchPatientsAction()
})
</script>

<template>
   <v-container>
      <h1 class="mb-4">Patient List</h1>

      <v-btn class="mb-4" color="primary" @click="goToCreate">
         <v-icon start>mdi-plus</v-icon>
         Add Patient
      </v-btn>

      <v-alert v-if="storeError" class="mb-4" closable type="error">
         Failed to load patient list: {{ storeError }}
      </v-alert>

      <v-progress-linear v-if="isLoading" color="primary" indeterminate></v-progress-linear>

      <v-table v-if="!isLoading && patients.length > 0" density="compact" hover>
         <thead>
            <tr>
               <th>ID</th>
               <th>PID</th>
               <th>Name</th>
               <th>Gender</th>
               <th>Birthday</th>
               <th>Phone</th>
               <th>Status</th>
               <th>Actions</th>
            </tr>
         </thead>
         <tbody>
            <tr v-for="patient in patients" :key="patient.id">
               <td>{{ patient.id }}</td>
               <td>{{ patient.pid }}</td>
               <td>{{ patient.familyName }}{{ patient.givenName }}</td>
               <td>{{ patient.gender }}</td>
               <td>{{ patient.birthday }}</td>
               <td>{{ patient.telecom }}</td>
               <td>
                  <v-chip :color="patient.active ? 'green' : 'grey'" density="compact" label>
                     {{ patient.active ? 'Active' : 'Inactive' }}
                  </v-chip>
               </td>
               <td>
                  <v-btn
                     color="info"
                     icon="mdi-eye"
                     size="small"
                     title="View Details"
                     variant="text"
                     @click="openDetailModal(patient)"
                  ></v-btn>
                  <v-btn
                     color="warning"
                     icon="mdi-pencil"
                     size="small"
                     title="Edit"
                     variant="text"
                     @click="goToEdit(patient.id)"
                  ></v-btn>
                  <v-btn
                     color="error"
                     icon="mdi-delete"
                     size="small"
                     title="Delete"
                     variant="text"
                     @click="confirmDelete(patient.id)"
                  ></v-btn>
               </td>
            </tr>
         </tbody>
      </v-table>

      <v-alert v-if="!isLoading && patients.length === 0 && !storeError" type="info">
         No patient data available at this time.
      </v-alert>

      <PatientDetailModal v-model="isDetailModalVisible" />
   </v-container>
</template>

<style scoped></style>

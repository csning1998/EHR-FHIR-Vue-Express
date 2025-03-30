// src/stores/patientStore.ts
import { computed, ref } from 'vue' // Import necessary Composition API functions from Vue.
import { defineStore } from 'pinia' // Import Pinia's store definition function.
import { patientService } from '@/services/patientService' // Import the service responsible for patient API calls.
import type { NewPatient, Patient } from '@/types/patient' // Import TypeScript types for patients.

/**
 * @store usePatientStore (Pinia Setup Store)
 * @id patients
 * @description Manages the state and actions related to patient data within the frontend application.
 * Uses Pinia's Setup Store syntax, which leverages the Vue Composition API (`ref`, `computed`, functions)
 * for defining state, getters, and actions within a setup function scope.
 * @design
 * - Setup Store Syntax: Offers better TypeScript inference and feels more aligned with Vue 3's Composition API compared to the Options Store syntax.
 * - State Management: Uses `ref` for reactive state variables (`patients`, `currentPatient`, loading/error flags). Changes to these refs will trigger UI updates.
 * - Getters: Uses `computed` for derived state (`patientCount`). These are cached and only re-evaluate when their dependencies change.
 * - Actions: Defined as async functions that typically call methods from `patientService`. They handle asynchronous operations (API calls), manage loading states, capture errors, and update the reactive state.
 * - Error/Loading Handling: Includes specific `ref`s (`loadingList`, `loadingDetail`, `submittingForm`, `error`, etc.) to track the status of asynchronous operations. This allows the UI to provide feedback to the user (e.g., showing spinners, displaying error messages).
 * - FHIR Interaction State: Includes dedicated state variables (`isPushingToFhir`, `fhirJsonData`, etc.) to manage the status and results of FHIR-related operations initiated from the frontend.
 */
export const usePatientStore = defineStore('patients', () => {
   // --- Reactive State ---
   // Design: Using `ref` makes individual pieces of state reactive.

   /** @state patients - Array holding the list of all fetched patients. */
   const patients = ref<Patient[]>([])
   /** @state currentPatient - Holds the data of a single patient being viewed or edited, or null if none. */
   const currentPatient = ref<Patient | null>(null)
   /** @state loadingList - Boolean flag indicating if the patient list is currently being fetched. */
   const loadingList = ref(false)
   /** @state loadingDetail - Boolean flag indicating if a single patient's details are being fetched. */
   const loadingDetail = ref(false)
   /** @state submittingForm - Boolean flag indicating if a create/update/delete operation is in progress. */
   const submittingForm = ref(false) // Could be split (loadingCreate, loadingUpdate, loadingDelete) for finer control.
   /** @state error - Stores the last encountered error message string during patient operations, or null if no error. */
   const error = ref<string | null>(null)

   // State specifically for FHIR push operations initiated from the UI.
   /** @state isPushingToFhir - Boolean flag indicating if a "push to FHIR" request is active. */
   const isPushingToFhir = ref(false)
   /** @state fhirPushError - Stores error message if a FHIR push operation failed. */
   const fhirPushError = ref<string | null>(null)
   /** @state fhirPushSuccessMessage - Stores success message after a FHIR push operation. */
   const fhirPushSuccessMessage = ref<string | null>(null)

   // State specifically for fetching/displaying FHIR JSON representation.
   /** @state fhirJsonData - Stores the fetched FHIR Patient resource JSON object, or null. */
   const fhirJsonData = ref<any>(null) // Use `any` for now, or define a specific FHIR Patient interface if needed.
   /** @state loadingFhirJson - Boolean flag indicating if FHIR JSON is being fetched. */
   const loadingFhirJson = ref(false)
   /** @state fhirJsonError - Stores error message if fetching FHIR JSON failed. */
   const fhirJsonError = ref<string | null>(null)

   // --- Getters (Computed Properties) ---
   // Design: `computed` provides efficient, cached derived state.

   /** @getter patientCount - Returns the current number of patients in the `patients` array. */
   const patientCount = computed(() => patients.value.length)

   // --- Actions (Functions) ---
   // Design: Actions encapsulate logic for fetching data or performing mutations.
   // They often involve asynchronous operations, manage loading/error states, and update the reactive state refs.

   /** @action clearError - Resets the main error state variable. */
   const clearError = () => {
      error.value = null
   }

   /** @action clearFhirPushStatus - Resets all state variables related to the FHIR push operation. */
   const clearFhirPushStatus = () => {
      fhirPushError.value = null
      fhirPushSuccessMessage.value = null
      isPushingToFhir.value = false
   }

   /** @action clearFhirJsonStatus - Resets all state variables related to fetching FHIR JSON. */
   const clearFhirJsonStatus = () => {
      fhirJsonData.value = null
      fhirJsonError.value = null
      loadingFhirJson.value = false
   }

   /**
    * @action fetchPatientsAction
    * @description Fetches the complete list of patients from the backend API via `patientService`.
    * Updates the `patients` state and manages `loadingList` and `error` states.
    * @returns {Promise<void>}
    */
   const fetchPatientsAction = async (): Promise<void> => {
      clearError() // Clear previous errors before starting.
      loadingList.value = true // Set loading state to true.
      console.log('[PatientStore] Fetching patient list...')
      try {
         // Call the service method.
         patients.value = await patientService.getAll()
         console.log('[PatientStore] Patient list fetched successfully.')
      } catch (err: any) {
         // Handle errors from the API call.
         console.error('[PatientStore] Failed to fetch patient list:', err)
         // Extract a user-friendly error message from the Axios error response or use a generic message.
         error.value = err.response?.data?.message || err.message || 'Unable to fetch patient list.'
      } finally {
         // Ensure loading state is reset regardless of success or failure.
         loadingList.value = false
      }
   }

   /**
    * @action fetchPatientByIdAction
    * @description Fetches the details of a single patient by their ID.
    * Updates the `currentPatient` state and manages `loadingDetail` and `error` states.
    * @param {number} id - The ID of the patient to fetch.
    * @returns {Promise<void>}
    */
   const fetchPatientByIdAction = async (id: number): Promise<void> => {
      clearError()
      loadingDetail.value = true
      currentPatient.value = null // Clear any previous patient data before fetching.
      console.log(`[PatientStore] Fetching patient details for ID: ${id}...`)
      try {
         currentPatient.value = await patientService.getById(id)
         console.log(`[PatientStore] Patient ${id} data fetched successfully.`)
      } catch (err: any) {
         console.error(`[PatientStore] Failed to fetch patient ${id}:`, err)
         if (err.response?.status === 404) {
            error.value = `Patient with ID ${id} not found.`
         } else {
            error.value =
               err.response?.data?.message || err.message || `Unable to fetch patient ${id}.`
         }
         // Optionally rethrow if the calling component needs to handle the error specifically:
         // throw err;
      } finally {
         loadingDetail.value = false
      }
   }

   /**
    * @action createPatientAction
    * @description Sends data to create a new patient via `patientService`.
    * Refetches the patient list on success to update the UI.
    * Manages `submittingForm` and `error` states.
    * @param {NewPatient} patientData - Patient data (without ID).
    * @returns {Promise<boolean>} `true` if creation was successful, `false` otherwise.
    */
   const createPatientAction = async (patientData: NewPatient): Promise<boolean> => {
      clearError()
      submittingForm.value = true
      console.log('[PatientStore] Attempting to create patient...')
      try {
         // Backend service handles creation and potential FHIR push triggering.
         await patientService.create(patientData)
         console.log('[PatientStore] Patient created successfully via service.')
         // Refresh the patient list in the store to include the new patient.
         await fetchPatientsAction() // Ensures UI consistency.
         return true // Indicate success to the calling component.
      } catch (err: any) {
         console.error('[PatientStore] Failed to create patient:', err)
         // Handle specific errors like conflicts (duplicate PID)
         if (err.response?.status === 409) {
            error.value =
               err.response.data?.message ||
               'Failed to create patient due to a conflict (e.g., duplicate ID).'
         } else {
            error.value = err.response?.data?.message || err.message || 'Failed to create patient.'
         }
         return false // Indicate failure.
      } finally {
         submittingForm.value = false
      }
   }

   /**
    * @action updatePatientAction
    * @description Sends data to update an existing patient via `patientService`.
    * Refetches the patient list on success. Manages `submittingForm` and `error` states.
    * @param {Patient} patientData - Full patient data including the ID.
    * @returns {Promise<boolean>} `true` if update was successful, `false` otherwise.
    */
   const updatePatientAction = async (patientData: Patient): Promise<boolean> => {
      // Basic validation within the action.
      if (!patientData.id) {
         console.error('[PatientStore] Cannot update patient: Missing ID.')
         error.value = 'Cannot update patient data without an ID.'
         return false
      }
      clearError()
      submittingForm.value = true
      console.log(`[PatientStore] Attempting to update patient ID: ${patientData.id}...`)
      try {
         // Backend service handles update and potential FHIR push triggering.
         await patientService.update(patientData.id, patientData)
         console.log(`[PatientStore] Patient ${patientData.id} updated successfully via service.`)
         // Refresh the list to show updated data.
         await fetchPatientsAction()
         // If editing the currently viewed patient, potentially refresh `currentPatient` too,
         // although reloading the list might be sufficient depending on UI.
         if (currentPatient.value?.id === patientData.id) {
            currentPatient.value = { ...currentPatient.value, ...patientData } // Optimistic update locally
         }
         return true
      } catch (err: any) {
         console.error(`[PatientStore] Failed to update patient ${patientData.id}:`, err)
         if (err.response?.status === 404) {
            error.value = `Patient with ID ${patientData.id} not found for update.`
         } else if (err.response?.status === 409) {
            error.value =
               err.response.data?.message || 'Failed to update patient due to a conflict.'
         } else {
            error.value = err.response?.data?.message || err.message || 'Failed to update patient.'
         }
         return false
      } finally {
         submittingForm.value = false
      }
   }

   /**
    * @action deletePatientAction
    * @description Deletes a patient by ID via `patientService`.
    * Refetches the patient list on success. Manages loading/error states.
    * @param {number} id - The ID of the patient to delete.
    * @returns {Promise<boolean>} `true` if deletion was successful, `false` otherwise.
    */
   const deletePatientAction = async (id: number): Promise<boolean> => {
      clearError()
      // Using submittingForm, but a dedicated `loadingDelete` ref could be used.
      submittingForm.value = true
      console.log(`[PatientStore] Attempting to delete patient ID: ${id}...`)
      try {
         await patientService.deletePatient(id)
         console.log(`[PatientStore] Patient ${id} deleted successfully via service.`)
         // Refresh list to remove the deleted patient.
         await fetchPatientsAction()
         // If the deleted patient was the `currentPatient`, clear it.
         if (currentPatient.value?.id === id) {
            clearCurrentPatient()
         }
         return true
      } catch (err: any) {
         console.error(`[PatientStore] Failed to delete patient ${id}:`, err)
         if (err.response?.status === 404) {
            error.value = `Patient with ID ${id} not found for deletion.`
         } else {
            error.value =
               err.response?.data?.message || err.message || `Failed to delete patient ${id}.`
         }
         return false
      } finally {
         submittingForm.value = false
      }
   }

   /**
    * @action fetchFhirJsonAction
    * @description Fetches the FHIR JSON representation of a patient via `patientService`.
    * Manages `loadingFhirJson`, `fhirJsonData`, and `fhirJsonError` states.
    * @param {number} patientId - The internal ID of the patient.
    * @returns {Promise<void>}
    */
   const fetchFhirJsonAction = async (patientId: number): Promise<void> => {
      // Optional: Caching check - could skip fetch if data for this ID already exists.
      // if (fhirJsonData.value?.internalId === patientId) { // Assuming you add internalId to stored data
      //   console.log(`[PatientStore] FHIR JSON for ${patientId} already loaded.`);
      //   return;
      // }

      clearFhirJsonStatus() // Clear previous FHIR JSON state.
      loadingFhirJson.value = true
      console.log(`[PatientStore] Fetching FHIR JSON for patient ID: ${patientId}...`)
      try {
         const result = await patientService.getFhirJson(patientId)
         fhirJsonData.value = result // Store the fetched JSON data.
         // fhirJsonData.value.internalId = patientId; // Optionally store the internal ID for caching checks
         console.log(`[PatientStore] FHIR JSON fetched successfully for ${patientId}.`)
      } catch (err: any) {
         console.error(`[PatientStore] Error fetching FHIR JSON for ${patientId}:`, err)
         if (err.response?.status === 404) {
            fhirJsonError.value = `Patient with ID ${patientId} not found for FHIR JSON retrieval.`
         } else {
            fhirJsonError.value =
               err.response?.data?.message || err.message || 'Failed to fetch FHIR JSON.'
         }
      } finally {
         loadingFhirJson.value = false
      }
   }

   /**
    * @action clearCurrentPatient
    * @description Resets the `currentPatient` state to null and clears related errors.
    * Useful when navigating away from a patient detail/edit view.
    */
   const clearCurrentPatient = () => {
      currentPatient.value = null
      error.value = null // Clear general errors as they might relate to the previous patient.
      // Keep FHIR JSON data/errors separate unless required.
      console.log('[PatientStore] Cleared current patient data.')
   }

   /**
    * @action pushToFhirAction
    * @description Triggers the push of a patient's data to the FHIR server via `patientService`.
    * Manages FHIR push-specific loading and status states (`isPushingToFhir`, `fhirPushError`, `fhirPushSuccessMessage`).
    * @param {number} patientId - The internal ID of the patient to push.
    * @returns {Promise<boolean>} `true` if the push was successfully *triggered* (API call succeeded), `false` otherwise. Note: This doesn't guarantee the data was accepted by the FHIR server, only that the backend API call completed without error.
    */
   const pushToFhirAction = async (patientId: number): Promise<boolean> => {
      clearFhirPushStatus() // Clear previous push status.
      isPushingToFhir.value = true
      console.log(`[PatientStore] Triggering FHIR push for patient ID: ${patientId}...`)
      try {
         // Call the service method that interacts with the backend's push endpoint.
         const response = await patientService.pushToFhir(patientId)
         // Store the success message from the backend response.
         fhirPushSuccessMessage.value =
            response?.message || `Successfully triggered push for Patient ${patientId}.`
         console.log(`[PatientStore] FHIR push triggered successfully for ${patientId}.`)
         return true // Indicate the trigger API call was successful.
      } catch (err: any) {
         console.error(`[PatientStore] Error triggering FHIR push for ${patientId}:`, err)
         if (err.response?.status === 404) {
            fhirPushError.value = `Patient with ID ${patientId} not found for FHIR push trigger.`
         } else {
            fhirPushError.value =
               err.response?.data?.message || err.message || 'Failed to trigger FHIR push.'
         }
         return false // Indicate the trigger API call failed.
      } finally {
         isPushingToFhir.value = false
      }
   }

   // --- Expose State and Actions ---
   // Return everything that needs to be accessible from components or other stores.
   return {
      // State refs
      patients,
      currentPatient,
      loadingList,
      loadingDetail,
      submittingForm,
      error,
      fhirJsonData,
      loadingFhirJson,
      fhirJsonError,
      isPushingToFhir,
      fhirPushError,
      fhirPushSuccessMessage,

      // Getters (computed properties)
      patientCount,

      // Actions (methods)
      fetchPatientsAction,
      fetchPatientByIdAction,
      createPatientAction,
      updatePatientAction,
      deletePatientAction,
      clearCurrentPatient,
      clearFhirJsonStatus,
      fetchFhirJsonAction,
      clearError, // Expose error clearing actions
      pushToFhirAction,
      clearFhirPushStatus,
   }
})

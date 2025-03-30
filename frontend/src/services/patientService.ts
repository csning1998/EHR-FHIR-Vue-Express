// src/services/patientService.ts
import apiClient from './apiClient'
// Recommended: Define types in a separate file, e.g., src/types/patient.ts
import type { NewPatient, Patient } from '@/types/patient' // Assumes types are defined

// Service object providing methods for patient-related API operations
export const patientService = {
   /**
    * Retrieves a list of all patients.
    * @returns {Promise<Patient[]>} Array of patient objects
    */
   async getAll(): Promise<Patient[]> {
      const response = await apiClient.get<Patient[]>('/patients')
      return response.data
   },

   /**
    * Retrieves a single patient by ID.
    * @param {number} id - The patient's ID
    * @returns {Promise<Patient>} The patient object
    */
   async getById(id: number): Promise<Patient> {
      const response = await apiClient.get<Patient>(`/patients/${id}`)
      return response.data
   },

   /**
    * Creates a new patient.
    * @param {NewPatient} patientData - The data for the new patient
    * @returns {Promise<Patient>} The created patient object
    */
   async create(patientData: NewPatient): Promise<Patient> {
      const response = await apiClient.post<Patient>('/patients', patientData)
      return response.data
   },

   /**
    * Updates an existing patient.
    * @param {number} id - The patient's ID
    * @param {Patient} patientData - The updated patient data
    * @returns {Promise<Patient>} The updated patient object
    */
   async update(id: number, patientData: Patient): Promise<Patient> {
      const response = await apiClient.put<Patient>(`/patients/${id}`, patientData)
      return response.data
   },

   /**
    * Deletes a patient by ID.
    * @param {number} id - The patient's ID
    * @returns {Promise<void>}
    */
   async deletePatient(id: number): Promise<void> {
      // DELETE requests typically return no body or a 204 status
      await apiClient.delete(`/patients/${id}`)
   },

   /**
    * Triggers pushing a specified patient to the FHIR server.
    * @param {number} id - The patient's ID
    * @returns {Promise<{ message: string } | any>} The backend response message or data
    * @throws {any} Re-throws errors for handling by the caller (e.g., Store)
    */
   async pushToFhir(id: number): Promise<{ message: string } | any> {
      // Adjusted return type
      try {
         console.log(`[PatientService] Triggering FHIR push for patient ID: ${id}`)
         // Call the new backend POST endpoint
         const response = await apiClient.post<{ message: string }>(`/patients/${id}/push-to-fhir`)
         console.log(`[PatientService] FHIR push API response for ${id}:`, response.data)
         return response.data // Return backend message
      } catch (error: any) {
         console.error(
            `[PatientService] Error triggering FHIR push for patient ID ${id}:`,
            error.response?.data || error,
         )
         // Rethrow error for Store to handle
         throw error
      }
   },

   /**
    * Retrieves a patient's data in FHIR JSON format by ID.
    * @param {number} id - The patient's ID
    * @returns {Promise<any>} The FHIR Patient resource object
    * @throws {any} Re-throws errors for handling by the caller
    */
   async getFhirJson(id: number): Promise<any> {
      // Uses any or a more specific FHIR type could be defined
      try {
         console.log(`[PatientService] Fetching FHIR JSON for patient ID: ${id}`)
         // Call the backend GET endpoint
         const response = await apiClient.get<any>(`/patients/${id}/fhir`) // Uses GET
         console.log(`[PatientService] Received FHIR JSON for ${id}:`, response.data)
         return response.data // Return FHIR resource object
      } catch (error: any) {
         console.error(
            `[PatientService] Error fetching FHIR JSON for patient ID ${id}:`,
            error.response?.data || error,
         )
         throw error // Rethrow error
      }
   },
}

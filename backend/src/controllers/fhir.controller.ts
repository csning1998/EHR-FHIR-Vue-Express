// backend/src/controllers/fhir.controller.ts
import { Request, Response } from 'express';
import { PatientService } from '../services/patient.service'; // Import the PatientService class
import { FhirService } from '../services/fhir.service'; // Import the FhirService class
// Assuming a custom error type exists

const patientService = new PatientService();
const fhirService = new FhirService(patientService); // Inject patientService instance into fhirService

/**
 * Retrieves a patient's FHIR Patient resource by their primary key ID.
 * @route GET /api/patients/:id/fhir
 */
export const getPatientAsFhir = async (req: Request, res: Response): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        console.log(
            `[API][${new Date().toISOString()}] GET /api/patients/${id}/fhir - Requesting FHIR Patient resource.`
        );

        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid patient ID format' });
            return;
        }

        // Call FhirService to perform the conversion
        const fhirPatientResource = await fhirService.convertDbPatientToFhir(id);

        if (fhirPatientResource) {
            // Set Content-Type header to FHIR JSON
            res.setHeader('Content-Type', 'application/fhir+json');
            res.status(200).json(fhirPatientResource);
        } else {
            res.status(404).json({
                message: `Patient with ID ${id} not found for FHIR conversion`,
            });
        }
    } catch (error: any) {
        console.error(
            `[API][${new Date().toISOString()}] GET /api/patients/${req.params.id}/fhir - Error:`,
            error
        );
        res.status(500).json({ message: 'Error occurred while converting to FHIR resource' });
    }
};

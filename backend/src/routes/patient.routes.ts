// backend/src/routes/patient.routes.ts
import { Router } from 'express';
import {
    createPatient,
    deletePatient,
    getAllPatients,
    getPatientById,
    pushPatientToFhir,
    updatePatient,
} from '../controllers/patient.controller';
import { getPatientAsFhir } from '../controllers/fhir.controller'; // Import FHIR Controller function

const router = Router();

/**
 * Retrieves a list of all patients.
 * @route GET /api/patients
 */
router.get('/', getAllPatients); // GET /api/patients

/**
 * Creates a new patient.
 * @route POST /api/patients
 */
router.post('/', createPatient); // POST /api/patients

/**
 * Retrieves a patient by ID.
 * @route GET /api/patients/:id
 */
router.get('/:id', getPatientById);

/**
 * Updates an existing patient by ID.
 * @route PUT /api/patients/:id
 */
router.put('/:id', updatePatient);

/**
 * Deletes a patient by ID.
 * @route DELETE /api/patients/:id
 */
router.delete('/:id', deletePatient);

/**
 * Retrieves a patient in FHIR format by ID.
 * @route GET /api/patients/:id/fhir
 */
router.get('/:id/fhir', getPatientAsFhir); // GET /api/patients/:id/fhir

/**
 * Pushes a patient's data to an FHIR server by ID.
 * @route POST /api/patients/:id/push-to-fhir
 * @description Uses POST to indicate an action being performed.
 */
router.post('/:id/push-to-fhir', pushPatientToFhir); // POST typically indicates an action

export default router;

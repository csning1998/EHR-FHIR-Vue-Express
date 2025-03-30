// backend/src/controllers/patient.controller.ts
import { NextFunction, Request, Response } from 'express';
import { PatientService } from '../services/patient.service'; // Service for core patient logic
import { FhirService } from '../services/fhir.service'; // Service for FHIR-related operations
import { ConflictError, NotFoundError } from '../utils/error'; // Custom error class for handling 404s

// --- Dependency Instantiation ---
// In a real-world scenario with dependency injection (DI), these would be injected.
// For simplicity here, we instantiate them directly.
const patientService = new PatientService();
// Inject the patientService instance into FhirService, as FhirService needs it for data conversion.
const fhirService = new FhirService(patientService);

/**
 * @controller PatientController
 * @description Handles incoming HTTP requests related to patient resources.
 * Delegates business logic to the PatientService and FhirService.
 * Responsible for request validation (basic checks like ID format),
 * calling appropriate service methods, and formatting responses (or errors).
 * @design Adheres to the Controller layer responsibility: acting as an interface between
 * HTTP requests and the application's business logic (services). It avoids
 * containing complex business rules or direct database access.
 */

/**
 * @function getAllPatients
 * @description Retrieves and returns a list of all patients.
 * @route GET /api/patients
 * @param {Request} req - Express request object.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function (for error handling).
 * @returns {Promise<void>} Sends a JSON response with the patient list or passes error to next().
 */
export const getAllPatients = async (
    req: Request,
    res: Response,
    next: NextFunction // Include next for error delegation
): Promise<void> => {
    try {
        console.log(`[Controller] Handling GET /api/patients`);
        // Delegate fetching logic entirely to the service layer.
        const patients = await patientService.findAll();
        console.log(`[Controller] Found ${patients.length} patients.`);
        // Send successful response.
        res.status(200).json(patients);
    } catch (error) {
        console.error(`[Controller] Error in getAllPatients:`, error);
        // Pass any unexpected errors to the central error handling middleware.
        next(error);
    }
};

/**
 * @function getPatientById
 * @description Retrieves a single patient based on the ID provided in the route parameter.
 * @route GET /api/patients/:id
 * @param {Request} req - Express request object, expecting `req.params.id`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends a JSON response with the patient data or an appropriate error status.
 */
export const getPatientById = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10); // Extract and parse ID from route params.
        console.log(`[Controller] Handling GET /api/patients/${id}`);

        // Basic input validation at the controller level.
        if (isNaN(id)) {
            // Use 400 for bad client input format.
            res.status(400).json({ message: 'Invalid patient ID format' });
            return; // Stop execution here.
        }

        // Delegate fetching to the service.
        const patient = await patientService.findById(id);
        // Service handles the NotFoundError throwing.

        // If service call succeeds, send 200 OK.
        res.status(200).json(patient);
    } catch (error: any) {
        console.error(`[Controller] Error in getPatientById for id ${req.params.id}:`, error);
        // Handle specific errors thrown by the service.
        if (error instanceof NotFoundError) {
            // If the service specifically threw NotFoundError.
            res.status(error.statusCode).json({ message: error.message });
        } else {
            // Pass other errors (e.g., database connection issues, unexpected errors) to the central handler.
            next(error);
        }
    }
};

/**
 * @function createPatient
 * @description Creates a new patient record based on data in the request body.
 * After successful local creation, it triggers an *asynchronous* push to the FHIR server.
 * @route POST /api/patients
 * @param {Request} req - Express request object, expecting patient data in `req.body`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends a 201 Created response with the new patient data or an error status.
 * @design
 * - Separation of Concerns: Core patient creation is handled by `patientService`.
 * - Asynchronous FHIR Push: The push to the FHIR server is initiated *after* the local record is successfully created but the API responds immediately with 201 Created. This improves API response time and decouples the core operation from the potentially slower/fallible external FHIR interaction.
 * - Error Handling: Catches specific errors (like `ConflictError` for duplicate PID from the service) and maps them to appropriate HTTP status codes (409 Conflict). Other errors are passed on.
 * - Logging: Logs the background FHIR push attempt result (success/failure) for monitoring but doesn't let FHIR push failures block the primary API response.
 */
export const createPatient = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        console.log(`[Controller] Handling POST /api/patients with body:`, req.body);
        // Basic validation for presence of body (more detailed validation should use DTOs + class-validator)
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({ message: 'Request body cannot be empty.' });
            return;
        }

        // 1. Create the patient record locally via the service.
        const savedPatient = await patientService.create(req.body);
        console.log(`[Controller] Patient created locally with ID: ${savedPatient.id}`);

        // 2. Trigger asynchronous FHIR push - *Fire and Forget* style from the controller's perspective.
        // We don't `await` this block because the primary operation (local creation) is complete.
        // The main API response should not depend on the FHIR push succeeding immediately.
        fhirService
            .convertDbPatientToFhir(savedPatient.id) // Convert the newly saved patient data
            .then((fhirPatient) => {
                // Check if conversion was successful and resource exists
                if (fhirPatient) {
                    return fhirService.pushFhirPatientToServer(fhirPatient); // Push the converted resource
                }
                return false; // Indicate push didn't happen if conversion failed
            })
            .then((pushed) => {
                // Log the outcome of the background push attempt.
                if (pushed) {
                    console.log(
                        `[Controller][Async] FHIR push successful for new Patient ${savedPatient.id}.`
                    );
                } else {
                    console.warn(
                        `[Controller][Async] FHIR push failed or skipped for new Patient ${savedPatient.id}.`
                    );
                }
            })
            .catch((fhirError) => {
                // Log errors from the background FHIR push process.
                // This does not affect the client's 201 response.
                console.error(
                    `[Controller][Async] Error during background FHIR push for new Patient ${savedPatient.id}:`,
                    fhirError
                );
            });

        // 3. Respond immediately with 201 Created and the locally saved patient data.
        res.status(201).json(savedPatient);
    } catch (error: any) {
        console.error(`[Controller] Error in createPatient:`, error);
        // Handle specific errors from the service layer.
        if (error instanceof ConflictError) {
            // Assuming ConflictError is defined and thrown by service for duplicates
            res.status(error.statusCode).json({ message: error.message });
        }
        // Add checks for other custom errors like BadRequestError if service performs validation
        // else if (error instanceof BadRequestError) {
        //     res.status(error.statusCode).json({ message: error.message, errors: error.errors });
        // }
        else {
            // Pass unknown errors to the central error handler.
            next(error);
        }
    }
};

/**
 * @function updatePatient
 * @description Updates an existing patient record by ID using data from the request body.
 * Triggers an asynchronous push to the FHIR server after successful local update.
 * @route PUT /api/patients/:id
 * @param {Request} req - Express request object with `req.params.id` and update data in `req.body`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends a 200 OK response with the updated patient data or an error status.
 * @design Similar to `createPatient`, the FHIR push is asynchronous to keep the API responsive.
 * Handles `NotFoundError` from the service layer for non-existent patient IDs.
 */
export const updatePatient = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        console.log(`[Controller] Handling PUT /api/patients/${id} with body:`, req.body);

        // Basic validations
        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid patient ID format' });
            return;
        }
        if (!req.body || Object.keys(req.body).length === 0) {
            res.status(400).json({ message: 'Request body cannot be empty for update.' });
            return;
        }

        // 1. Update patient locally via service.
        const updatedPatient = await patientService.update(id, req.body);
        console.log(`[Controller] Patient ${id} updated locally.`);

        // 2. Trigger asynchronous FHIR push.
        fhirService
            .convertDbPatientToFhir(updatedPatient.id)
            .then((fhirPatient) => fhirPatient && fhirService.pushFhirPatientToServer(fhirPatient))
            .then((pushed) => {
                if (pushed)
                    console.log(
                        `[Controller][Async] FHIR push successful for updated Patient ${updatedPatient.id}.`
                    );
                else
                    console.warn(
                        `[Controller][Async] FHIR push failed or skipped for updated Patient ${updatedPatient.id}.`
                    );
            })
            .catch((fhirError) => {
                console.error(
                    `[Controller][Async] Error during background FHIR push for updated Patient ${updatedPatient.id}:`,
                    fhirError
                );
            });

        // 3. Respond immediately with 200 OK.
        res.status(200).json(updatedPatient);
    } catch (error: any) {
        console.error(`[Controller] Error in updatePatient for id ${req.params.id}:`, error);
        // Handle specific errors like NotFoundError or ConflictError (if PID update causes conflict).
        if (error instanceof NotFoundError) {
            res.status(error.statusCode).json({ message: error.message });
        } else if (error instanceof ConflictError) {
            res.status(error.statusCode).json({ message: error.message });
        }
        // Add checks for other potential service errors (e.g., validation)
        else {
            next(error); // Pass to global handler.
        }
    }
};

/**
 * @function deletePatient
 * @description Deletes a patient record by ID.
 * @route DELETE /api/patients/:id
 * @param {Request} req - Express request object with `req.params.id`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends a 204 No Content response on success or an error status.
 * @design Corresponds to the HTTP DELETE method semantics. A successful deletion typically returns 204 No Content.
 * Handles `NotFoundError` from the service if the patient doesn't exist.
 * @note FHIR Deletion: This currently only deletes the local record. A corresponding FHIR delete operation (`DELETE /Patient/:id`) on the FHIR server might be needed depending on the workflow requirements. This is not implemented here.
 */
export const deletePatient = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        console.log(`[Controller] Handling DELETE /api/patients/${id}`);
        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid patient ID format' });
            return;
        }

        // Delegate deletion to the service.
        await patientService.remove(id);
        console.log(`[Controller] Patient ${id} deleted locally.`);

        // TODO: Consider triggering a DELETE request to the FHIR server here if needed.
        // e.g., fhirService.deleteFhirPatient(patientPID).catch(err => console.error(...));

        // Send 204 No Content on successful deletion.
        res.status(204).send();
    } catch (error: any) {
        console.error(`[Controller] Error in deletePatient for id ${req.params.id}:`, error);
        if (error instanceof NotFoundError) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            next(error); // Pass other errors to the global handler.
        }
    }
};

// --- FHIR Specific Endpoints Handled by Patient Controller (Could be moved to a dedicated FHIR Controller) ---

/**
 * @function getPatientAsFhir
 * @description Retrieves the FHIR Patient resource representation for a given internal patient ID.
 * @route GET /api/patients/:id/fhir
 * @param {Request} req - Express request object with `req.params.id`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends the FHIR Patient resource as JSON or an error status.
 * @design Leverages `fhirService.convertDbPatientToFhir` for the conversion logic.
 * Sets the correct `Content-Type` header (`application/fhir+json`) for FHIR resources.
 */
export const getPatientAsFhir = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        console.log(`[Controller] Handling GET /api/patients/${id}/fhir`);
        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid patient ID format' });
            return;
        }

        // Delegate conversion to the FHIR service.
        const fhirPatientResource = await fhirService.convertDbPatientToFhir(id);

        if (fhirPatientResource) {
            // Set the standard FHIR JSON content type header.
            res.setHeader('Content-Type', 'application/fhir+json; charset=utf-8');
            res.status(200).json(fhirPatientResource);
        } else {
            // If service returns null, the original patient wasn't found.
            res.status(404).json({
                message: `Patient with ID ${id} not found for FHIR conversion`,
            });
        }
    } catch (error: any) {
        console.error(`[Controller] Error in getPatientAsFhir for id ${req.params.id}:`, error);
        if (error instanceof NotFoundError) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            next(error); // Pass other errors.
        }
    }
};

/**
 * @function pushPatientToFhir
 * @description Manually triggers the process to push a specific patient's data to the configured FHIR server.
 * @route POST /api/patients/:id/push-to-fhir
 * @param {Request} req - Express request object with `req.params.id`.
 * @param {Response} res - Express response object.
 * @param {NextFunction} next - Express next middleware function.
 * @returns {Promise<void>} Sends a success message or an error status.
 * @design Uses POST because it initiates an action (pushing data).
 * Delegates the entire push logic (conversion + sending) to `fhirService.triggerPushForPatient`.
 * The response indicates whether the trigger was *accepted* and initiated, not necessarily the final success of the push on the remote server (which might be asynchronous). A 202 Accepted might be more appropriate if the push is truly async internally.
 */
export const pushPatientToFhir = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const id = parseInt(req.params.id, 10);
        console.log(`[Controller] Handling POST /api/patients/${id}/push-to-fhir`);
        if (isNaN(id)) {
            res.status(400).json({ message: 'Invalid patient ID format' });
            return;
        }

        // Delegate the triggering and pushing logic to the service.
        const success = await fhirService.triggerPushForPatient(id);

        if (success) {
            // Respond indicating the push was successfully initiated.
            // Consider 202 Accepted if the actual push happens async in the service.
            res.status(200).json({
                message: `Successfully triggered push of Patient ${id} data to FHIR server.`,
            });
        } else {
            // If service returns false, it might be due to patient not found or push failure.
            // The service should ideally throw specific errors for better handling here.
            // For now, a generic 500 or potentially 404/400 might be suitable depending on expected failure modes.
            // Let's assume service throws NotFoundError if patient doesn't exist for conversion.
            res.status(500).json({
                message: `Failed to trigger FHIR push for Patient ${id}. See server logs for details.`,
            });
        }
    } catch (error: any) {
        console.error(`[Controller] Error in pushPatientToFhir for id ${req.params.id}:`, error);
        if (error instanceof NotFoundError) {
            res.status(error.statusCode).json({ message: error.message });
        } else {
            next(error); // Pass other errors.
        }
    }
};

// backend/src/services/fhir.service.ts
// Service responsible for FHIR-related operations, primarily converting internal patient data to FHIR resources and interacting with an external FHIR server.

import {
    Address,
    CodeableConcept,
    ContactPoint,
    HumanName,
    Identifier,
    Patient,
    PatientCommunication,
    PatientContact
} from 'fhir/r5' // Assuming R5 version based on common usage; adjust if using R4 ('fhir/r4').
import { PatientService } from './patient.service' // Dependency: Needs PatientService to fetch internal patient data.
import config from '../config' // Access FHIR target server URL and potentially other FHIR configs.
import axios, { AxiosError } from 'axios' // HTTP client for interacting with the external FHIR server.
import { InternalServerError, NotFoundError } from '../utils/error' // Custom error types for better error handling.

/**
 * @class FhirService
 * @description Provides methods for converting internal EHR patient data into FHIR Patient resources
 * and pushing these resources to a configured external FHIR server.
 * @design
 * - Dependency Injection (Conceptual): Takes `PatientService` as a dependency in its constructor. This promotes loose coupling and testability (can inject a mock PatientService during tests).
 * - Separation of Concerns: Isolates FHIR-specific logic (conversion, API interaction) from core patient CRUD operations (handled by PatientService).
 * - Error Handling: Includes specific error handling for configuration issues (missing FHIR server URL) and external API call failures (network errors, server errors from FHIR endpoint).
 */
export class FhirService {
    // Store the injected PatientService instance.
    private readonly patientService: PatientService;

    /**
     * @constructor
     * @param {PatientService} patientService - An instance of PatientService to fetch local patient data.
     */
    constructor(patientService: PatientService) {
        this.patientService = patientService;
        console.log('[FHIR Service] Initialized with PatientService dependency.');
    }

    /**
     * @method triggerPushForPatient
     * @description High-level method called by controllers to initiate the FHIR push process for a given internal patient ID.
     * It orchestrates the conversion and the actual push operation.
     * @param {number} patientId - The internal database ID of the patient to push.
     * @returns {Promise<boolean>} `true` if the FHIR resource was successfully sent and the target server responded positively (e.g., 200 OK or 201 Created), `false` otherwise (e.g., patient not found, conversion failed, push failed).
     * @throws {NotFoundError} If the patient with the given internal ID cannot be found by PatientService.
     * @throws {InternalServerError} For configuration issues (like missing FHIR server URL) or unexpected errors during the push.
     */
    async triggerPushForPatient(patientId: number): Promise<boolean> {
        console.log(`[FHIR Service] Triggering FHIR push for internal patient ID: ${patientId}`);
        try {
            // 1. Convert the internal patient data to an FHIR Patient resource.
            const fhirPatient = await this.convertDbPatientToFhir(patientId);

            // Handle case where patient doesn't exist or conversion fails.
            if (!fhirPatient) {
                console.warn(
                    `[FHIR Service] Cannot push patient ID ${patientId}: Failed to convert to FHIR resource (Patient likely not found).`
                );
                // Returning false indicates the operation didn't complete successfully.
                // Alternatively, could re-throw the NotFoundError caught during conversion if preferred.
                return false;
            }

            // 2. Push the generated FHIR resource to the target server.
            // The actual push logic is encapsulated in `pushFhirPatientToServer`.
            return await this.pushFhirPatientToServer(fhirPatient);
        } catch (error: any) {
            // Catch errors specifically from the conversion step (like NotFoundError from patientService.findById)
            if (error instanceof NotFoundError) {
                console.warn(
                    `[FHIR Service] Patient with ID ${patientId} not found during conversion process.`
                );
                throw error; // Re-throw NotFoundError for the controller to handle appropriately (e.g., return 404).
            }
            // Handle other unexpected errors during the trigger process.
            console.error(
                `[FHIR Service] Unexpected error during triggerPushForPatient for ID ${patientId}:`,
                error
            );
            throw new InternalServerError('Failed to trigger FHIR push due to an internal error.');
        }
    }

    /**
     * @method pushFhirPatientToServer
     * @description Sends the provided FHIR Patient resource to the configured FHIR server endpoint using an HTTP PUT request.
     * @param {Patient} fhirPatient - The FHIR Patient resource object to send.
     * @returns {Promise<boolean>} `true` if the request was successful (200 or 201 status), `false` otherwise.
     * @throws {InternalServerError} If the FHIR target server URL is not configured or if the FHIR Patient resource is missing its ID (which should be the PID).
     * @design
     * - RESTful Interaction: Uses HTTP PUT to `/Patient/[id]` which is the standard FHIR way to create or update a resource with a known ID. The `id` used here is the `patientEntity.pid`.
     * - Configuration Driven: Relies on `config.fhir.targetServerUrl` from the environment configuration.
     * - Robust Error Handling: Explicitly checks for missing configuration and missing patient ID. Catches Axios errors (network issues, non-2xx responses) and logs details.
     * - Content Type: Sets the correct `Content-Type` header (`application/fhir+json`).
     * - Authentication: Placeholder comment for adding `Authorization` header if the target FHIR server requires it.
     */
    async pushFhirPatientToServer(fhirPatient: Patient): Promise<boolean> {
        const targetUrl = config.fhir.targetServerUrl; // Get target FHIR server base URL.

        // Configuration Check: Ensure the target URL is actually set.
        if (!targetUrl) {
            console.error(
                '[FHIR Service] Critical configuration error: FHIR_TARGET_SERVER_URL is not defined. Cannot push patient.'
            );
            // Throw an error indicating a server misconfiguration.
            throw new InternalServerError('FHIR target server URL is not configured.');
        }
        // Data Integrity Check: Ensure the FHIR resource has an ID (derived from PID).
        if (!fhirPatient.id) {
            console.error(
                '[FHIR Service] FHIR Patient resource is missing its required ID (should be derived from PID). Aborting push.'
            );
            throw new InternalServerError('FHIR Patient resource is missing ID.');
        }

        // Construct the specific resource URL (e.g., https://fhir.example.com/Patient/A123456789)
        const url = `${targetUrl.replace(/\/$/, '')}/Patient/${fhirPatient.id}`; // Ensure no double slashes.
        console.log(
            `[FHIR Service] Pushing FHIR Patient (ID: ${fhirPatient.id}) to endpoint: ${url}`
        );

        try {
            // Perform the HTTP PUT request using Axios.
            const response = await axios.put(
                url,
                fhirPatient, // The FHIR Patient resource is the request body.
                {
                    headers: {
                        // Standard FHIR JSON content type.
                        'Content-Type': 'application/fhir+json; charset=utf-8',
                        // Add Authorization header if needed:
                        // 'Authorization': `Bearer ${your_token_here}`
                    },
                    timeout: 15000, // Set a reasonable timeout (e.g., 15 seconds).
                }
            );

            // Check for successful HTTP status codes (typically 200 OK for update, 201 Created for new resource).
            if (response.status === 200 || response.status === 201) {
                console.log(
                    `[FHIR Service] Successfully pushed/updated FHIR Patient ID: ${fhirPatient.id}. Target server responded with Status: ${response.status}`
                );
                return true; // Indicate success.
            } else {
                // Handle unexpected successful status codes (e.g., 204 No Content might be possible depending on server).
                console.warn(
                    `[FHIR Service] FHIR server responded with unexpected success status ${response.status} for Patient ID: ${fhirPatient.id}. Treating as potentially unsuccessful push.`
                );
                return false; // Indicate potential issue.
            }
        } catch (error: any) {
            // Handle errors during the Axios request (network errors, non-2xx responses).
            console.error(
                `[FHIR Service] Error pushing FHIR Patient ID: ${fhirPatient.id} to ${url}.`
            );
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;
                console.error(`  Axios Error Message: ${axiosError.message}`);
                if (axiosError.response) {
                    // The request was made and the server responded with a status code outside the 2xx range.
                    console.error(`  Target Server Status: ${axiosError.response.status}`);
                    console.error(`  Target Server Response Data:`, axiosError.response.data); // Often contains FHIR OperationOutcome
                } else if (axiosError.request) {
                    // The request was made but no response was received (e.g., network error, timeout).
                    console.error('  No response received from the target server.');
                } else {
                    // Something happened in setting up the request that triggered an Error.
                    console.error('  Error setting up the request:', axiosError.message);
                }
            } else {
                // Non-Axios error.
                console.error('  Non-Axios error occurred:', error);
            }
            return false; // Indicate failure.
        }
    }

    /**
     * @method convertDbPatientToFhir
     * @description Converts an internal PatientEntity (fetched by its DB ID) into a corresponding FHIR R5 Patient resource.
     * Handles mapping of fields, data types, and terminologies between the internal model and the FHIR standard.
     * @param {number} patientDbId - The internal database primary key ID of the patient.
     * @returns {Promise<Patient | null>} The converted FHIR Patient resource, or null if the patient with the given DB ID is not found.
     * @throws {NotFoundError} If the underlying `patientService.findById` call fails to find the patient.
     * @design Contains the core mapping logic. Each internal field is explicitly mapped to its corresponding FHIR element(s).
     * Uses helper functions (`mapGenderToFhir`, `mapLanguageToFhirCodeableConcept`, etc.) for complex mappings involving terminologies or specific structures.
     * Ensures the patient's `pid` is used as the FHIR resource `id`.
     */
    async convertDbPatientToFhir(patientDbId: number): Promise<Patient | null> {
        console.log(`[FHIR Service] Starting conversion for internal patient ID: ${patientDbId}`);
        // Fetch the patient data from the database using the PatientService.
        // This will throw NotFoundError if the patient doesn't exist, which will be caught by the caller (triggerPushForPatient).
        const patientEntity = await this.patientService.findById(patientDbId);
        // Null check (although findById should throw) for defensive programming.
        if (!patientEntity) {
            console.warn(
                `[FHIR Service] Patient entity not found for DB ID ${patientDbId} during conversion.`
            );
            return null; // Should ideally not be reached if findById throws NotFoundError.
        }

        // --- FHIR Resource Construction ---
        // Design Principle: Map each relevant field from PatientEntity to the FHIR Patient structure.
        // Use helper functions for complex mappings (like gender, language, relationships).

        // **Identifier**: Map the internal PID to a FHIR Identifier.
        // It's crucial to use a proper system OID or URL for the identifier system.
        const identifiers: Identifier[] = [];
        if (patientEntity.pid) {
            identifiers.push({
                use: 'official', // Indicates this is the primary/official identifier.
                // system: 'urn:oid:1.2.3.4.5.6.7', // FIXME: Replace with the actual OID or URL for your PID system.
                system: 'urn:ehr:system:pid', // Example placeholder system URL
                value: patientEntity.pid,
            });
        } else {
            // This case should ideally be prevented by DB constraints or validation.
            console.error(
                `[FHIR Service] Patient with DB ID ${patientDbId} is missing the required PID for FHIR ID mapping. Aborting conversion.`
            );
            // throw new InternalServerError(`Patient DB ID ${patientDbId} is missing PID.`);
            return null; // Cannot create a valid FHIR resource without an ID.
        }

        // **Name**: Map family and given names. FHIR 'given' is an array.
        const names: HumanName[] = [];
        if (patientEntity.familyName || patientEntity.givenName) {
            names.push({
                use: 'official', // Standard use code for primary name.
                family: patientEntity.familyName, // Required field in HumanName usually.
                given: patientEntity.givenName ? [patientEntity.givenName] : undefined, // FHIR expects an array of strings.
            });
        }

        // **Telecom**: Map phone and email.
        const telecoms: ContactPoint[] = [];
        if (patientEntity.telecom) {
            telecoms.push({
                system: 'phone', // FHIR code for phone.
                value: patientEntity.telecom,
                use: 'mobile', // Common use code, adjust if known otherwise (home, work).
            });
        }
        if (patientEntity.email) {
            telecoms.push({
                system: 'email', // FHIR code for email.
                value: patientEntity.email,
                // use: 'home', // Optional use code for email.
            });
        }

        // **Address**: Map address components.
        const addresses: Address[] = [];
        if (patientEntity.address || patientEntity.postalCode || patientEntity.country) {
            addresses.push({
                use: 'home', // Common use code, adjust if known otherwise (work, temp).
                // line: patientEntity.address ? [patientEntity.address] : undefined, // If address contains multiple lines, split into array. Assuming single line here.
                text: patientEntity.address, // Use 'text' for free-form address representation.
                // city: undefined, // Map if available
                // district: undefined, // Map if available
                // state: undefined, // Map if available
                postalCode: patientEntity.postalCode,
                country: patientEntity.country, // Use standard country codes if possible (e.g., ISO 3166).
            });
        }

        // **Communication**: Map preferred language using a helper for CodeableConcept.
        const communications: PatientCommunication[] = [];
        if (patientEntity.preferredLanguage) {
            communications.push({
                language: this.mapLanguageToFhirCodeableConcept(patientEntity.preferredLanguage), // Use helper.
                preferred: true, // Indicates this is the preferred language for communication.
            });
        }

        // **Contact (Emergency Contact)**: Map emergency contact details.
        const contacts: PatientContact[] = [];
        if (
            patientEntity.emergencyContactName ||
            patientEntity.emergencyContactPhone ||
            patientEntity.emergencyContactRelationship
        ) {
            const emergencyTelecoms: ContactPoint[] = [];
            if (patientEntity.emergencyContactPhone) {
                emergencyTelecoms.push({
                    system: 'phone',
                    value: patientEntity.emergencyContactPhone,
                    use: 'mobile', // Assuming mobile
                });
            }

            contacts.push({
                // Map relationship using helper for CodeableConcept.
                relationship: patientEntity.emergencyContactRelationship
                    ? [
                          this.mapRelationshipToFhirCodeableConcept(
                              patientEntity.emergencyContactRelationship
                          ),
                      ]
                    : undefined,
                // Map name to HumanName structure.
                name: patientEntity.emergencyContactName
                    ? { use: 'official', text: patientEntity.emergencyContactName } // Using 'text' for simplicity. Could map to family/given if structured.
                    : undefined,
                // Map contact's telecom info.
                telecom: emergencyTelecoms.length > 0 ? emergencyTelecoms : undefined,
                // gender: undefined, // Map if available
                // address: undefined, // Map if available
                // organization: undefined, // Map if available
                // period: undefined // Map if available
            });
        }

        // --- Assemble the FHIR Patient Resource ---
        // Ensure all required fields of the FHIR Patient resource are present.
        // Use the patient's PID as the logical resource ID.
        const fhirPatientResource: Patient = {
            resourceType: 'Patient', // Essential field for all FHIR resources.
            id: patientEntity.pid, // Use the PID as the FHIR resource ID.
            identifier: identifiers.length > 0 ? identifiers : undefined, // Include if identifiers exist.
            active: patientEntity.active, // Map boolean directly.
            name: names.length > 0 ? names : undefined, // Include if names exist.
            telecom: telecoms.length > 0 ? telecoms : undefined, // Include if telecoms exist.
            gender: this.mapGenderToFhir(patientEntity.gender), // Use helper for gender mapping. Required field.
            birthDate: patientEntity.birthday, // Map date string directly (YYYY-MM-DD format is expected). Required field.
            address: addresses.length > 0 ? addresses : undefined, // Include if addresses exist.
            communication: communications.length > 0 ? communications : undefined, // Include if communication prefs exist.
            contact: contacts.length > 0 ? contacts : undefined, // Include if emergency contacts exist.
            // deceasedBoolean: undefined, // Map if available
            // deceasedDateTime: undefined, // Map if available
            // maritalStatus: undefined, // Map if available using CodeableConcept
            // multipleBirthBoolean: undefined, // Map if available
            // multipleBirthInteger: undefined, // Map if available
            // photo: [], // Map if available (Attachment type)
            // generalPractitioner: [], // Map if available (Reference type)
            // managingOrganization: undefined, // Map if available (Reference type)
            // link: [], // Map if patient records are linked
        };

        console.log(
            `[FHIR Service] Conversion complete for internal patient ID: ${patientDbId} to FHIR ID: ${fhirPatientResource.id}`
        );
        return fhirPatientResource;
    }

    // --- Private Helper Mapping Functions ---
    // Design: Encapsulate mapping logic for specific fields, especially those involving terminologies (CodeableConcepts) or specific FHIR structures.

    /**
     * @private
     * @method mapGenderToFhir
     * @description Maps internal gender representation to standard FHIR administrative gender codes.
     * @param {string} gender - The gender string from the internal database (e.g., '男', 'Female', 'Others').
     * @returns {Patient['gender']} FHIR administrative gender code ('male', 'female', 'other', 'unknown').
     * @reference See FHIR AdministrativeGender value set: http://hl7.org/fhir/valueset-administrative-gender.html
     */
    private mapGenderToFhir(gender: string): Patient['gender'] {
        const lowerGender = gender?.toLowerCase() || 'unknown'; // Handle null/undefined, default to unknown.
        switch (lowerGender) {
            case 'Male': // Handle specific local representations first
            case 'm':
            case 'male':
                return 'male';
            case 'Female':
            case 'f':
            case 'female':
                return 'female';
            case 'Others':
            case 'o':
            case 'other':
                return 'other';
            default:
                console.warn(
                    `[FHIR Service] Unmapped gender value: '${gender}'. Mapping to 'unknown'.`
                );
                return 'unknown'; // Default FHIR code for unknown/unmapped gender.
        }
    }

    /**
     * @private
     * @method mapLanguageToFhirCodeableConcept
     * @description Converts an internal language string into a FHIR CodeableConcept structure, using standard language codes.
     * @param {string} lang - The language string (e.g., 'English', 'Mandarin').
     * @returns {CodeableConcept} A FHIR CodeableConcept representing the language.
     * @reference Uses BCP 47 language codes: https://www.rfc-editor.org/info/bcp47
     * @design Maps common input strings to standard codes. Includes original text. Uses the correct system URL for language codes.
     * @todo Expand with more language mappings as needed.
     */
    private mapLanguageToFhirCodeableConcept(lang: string): CodeableConcept {
        let code = 'und'; // Default: Undetermined language code.
        let display = lang; // Default display is the original input.

        const lowerLang = lang.toLowerCase();
        if (lowerLang === 'english') {
            code = 'en';
            display = 'English';
        } else if (lowerLang === 'mandarin' || lowerLang === '繁體中文' || lowerLang === '中文') {
            code = 'zh-TW'; // More specific for Traditional Chinese used in Taiwan. Could also use 'zh'.
            display = 'Mandarin Chinese (Traditional)';
        }
        // Add more mappings here...
        // else if (lowerLang === 'spanish') { code = 'es'; display = 'Spanish'; }

        return {
            coding: [
                {
                    system: 'urn:ietf:bcp:47', // Standard system URI for BCP 47 language codes.
                    code: code,
                    display: display, // Standard display name for the code.
                },
            ],
            text: lang, // Include the original text representation as provided.
        };
    }

    /**
     * @private
     * @method mapRelationshipToFhirCodeableConcept
     * @description Converts an internal relationship string into a FHIR CodeableConcept for patient contacts.
     * @param {string} relationship - The relationship string (e.g., 'Spouse', 'Mother').
     * @returns {CodeableConcept} A FHIR CodeableConcept representing the relationship.
     * @reference Uses codes from the v2 Contact Role code system (or potentially PatientContactRelationship value set).
     * http://terminology.hl7.org/CodeSystem/v2-0131
     * http://hl7.org/fhir/valueset-patient-contact-relationship.html (provides more roles)
     * @design Maps common relationship terms to standard codes. Includes original text.
     * @todo Review and expand mappings based on expected input values and FHIR standards. Consider using the more comprehensive PatientContactRelationship value set if needed.
     */
    private mapRelationshipToFhirCodeableConcept(relationship: string): CodeableConcept {
        let code: string | undefined = undefined; // Code from the chosen value set/code system.
        let system: string | undefined = undefined; // The URI of the code system.

        const lowerRelationship = relationship?.toLowerCase();

        // Example mappings using v2-0131 (Contact Role) - This is commonly used but might be limited.
        system = 'http://terminology.hl7.org/CodeSystem/v2-0131';
        switch (lowerRelationship) {
            case 'spouse':
                code = 'SPS';
                break; // Spouse
            case 'mother':
                code = 'MTH';
                break; // Mother
            case 'father':
                code = 'FTH';
                break; // Father
            case 'brother':
                code = 'BRO';
                break; // Brother
            case 'sister':
                code = 'SIS';
                break; // Sister
            case 'child':
                code = 'CHD';
                break; // Child
            case 'friend':
                code = 'FND';
                break; // Friend
            case 'emergency contact': // Example, might map to 'Emergency Contact Person'
            case 'emergency':
                code = 'E';
                break; // Emergency Contact
            case 'next of kin':
                code = 'N';
                break; // Next-of-Kin (often default)
            case 'partner':
                code = 'PRN';
                break; // Partner
            // ... add more mappings from v2-0131 or PatientContactRelationship as needed
            default:
                console.warn(
                    `[FHIR Service] Unmapped relationship value: '${relationship}'. Omitting standard code.`
                );
                system = undefined; // Don't include system/code if unmapped.
                break;
        }

        const coding = system && code ? [{ system: system, code: code }] : undefined;

        return {
            coding: coding,
            text: relationship, // Always include the original text.
        };
    }
}

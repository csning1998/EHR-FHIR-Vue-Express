// backend/src/services/patient.service.ts
import { AppDataSource } from '../config/dataSource';
import { PatientEntity } from '../models/entities/Patient.entity';
import { Repository } from 'typeorm';
import { NotFoundError } from '../utils/error';

// Define DTO (Data Transfer Object) types for creation and updates to enhance type safety
// These types should correspond to fields received from req.body in the Controller
type CreatePatientDto = Omit<
    PatientEntity,
    'id' | 'save' | 'remove' | 'hasId' | 'recover' | 'reload'
>; // Exclude BaseEntity methods and id from Entity
type UpdatePatientDto = Partial<CreatePatientDto>; // Allow partial fields for updates

export class PatientService {
    private readonly patientRepository: Repository<PatientEntity>;

    constructor() {
        // Obtain Repository instance in the Service constructor
        this.patientRepository = AppDataSource.getRepository(PatientEntity);
    }

    /**
     * Retrieves a list of all patients.
     * @returns {Promise<PatientEntity[]>} - An array of patient entities.
     */
    async findAll(): Promise<PatientEntity[]> {
        console.log('[Service] PatientService.findAll called');
        // Directly call the Repository's find method
        // Additional complex query conditions or relations can be added here
        return this.patientRepository.find({
            order: { id: 'ASC' },
        });
    }

    /**
     * Retrieves a single patient by primary key ID.
     * @param {number} id - The primary key ID of the patient.
     * @returns {Promise<PatientEntity>} - The patient entity.
     * @throws {NotFoundError} If no patient is found with the specified ID.
     * @throws {Error} If the ID format is invalid.
     */
    async findById(id: number): Promise<PatientEntity> {
        console.log(`[Service] PatientService.findById called with id: ${id}`);
        if (isNaN(id)) {
            throw new Error('Invalid ID format'); // Or throw a custom BadRequestError
        }
        const patient = await this.patientRepository.findOneBy({ id });
        if (!patient) {
            // Throw a specific error to allow the Controller to catch and return a 404
            throw new NotFoundError(`Patient with ID ${id} not found`);
        }
        return patient;
    }

    /**
     * Creates a new patient.
     * @param {CreatePatientDto} patientData - The data object conforming to CreatePatientDto structure.
     * @returns {Promise<PatientEntity>} - The newly created patient entity.
     * @throws {Error} If a database constraint (e.g., unique PID) is violated.
     */
    async create(patientData: CreatePatientDto): Promise<PatientEntity> {
        console.log('[Service] PatientService.create called with data:', patientData);
        // Additional business validation logic can be added here
        try {
            // Use create to instantiate in memory
            const newPatient = this.patientRepository.create(patientData);
            const savedPatient = await this.patientRepository.save(newPatient);
            console.log(`[Service] Patient ${savedPatient.id} created locally.`); // Use save to persist to the database

            return savedPatient;
        } catch (error: any) {
            // Catch specific database errors (e.g., unique constraint) and throw friendlier errors
            if (error.code === '23505') {
                // PostgreSQL unique violation
                throw new Error('Identity number (PID) already exists'); // Or a custom ConflictError
            }
            throw error; // Rethrow unhandled errors
        }
    }

    /**
     * Updates patient data for the specified ID.
     * @param {number} id - The ID of the patient to update.
     * @param {UpdatePatientDto} updateData - The data object containing fields to update.
     * @returns {Promise<PatientEntity>} - The updated patient entity.
     * @throws {NotFoundError} If no patient is found with the specified ID.
     * @throws {Error} If a database constraint (e.g., unique PID) is violated after update.
     */
    async update(id: number, updateData: UpdatePatientDto): Promise<PatientEntity> {
        console.log(`[Service] PatientService.update called for id: ${id}`);
        const patientToUpdate = await this.findById(id); // findById handles Not Found
        Object.assign(patientToUpdate, updateData);
        try {
            const updatedPatient = await this.patientRepository.save(patientToUpdate);
            console.log(`[Service] Patient ${updatedPatient.id} updated locally.`);

            return updatedPatient; // Return the locally updated result immediately
        } catch (error: any) {
            if (error.code === '23505') {
                // Check for unique constraint conflicts during update
                throw new Error('Updated identity number (PID) duplicates another record');
            }
            throw error;
        }
    }

    /**
     * Deletes a patient by the specified ID.
     * @param {number} id - The ID of the patient to delete.
     * @returns {Promise<void>}
     * @throws {NotFoundError} If no patient is found with the specified ID.
     * @throws {Error} If the ID format is invalid.
     */
    async remove(id: number): Promise<void> {
        console.log(`[Service] PatientService.remove called for id: ${id}`);
        if (isNaN(id)) {
            throw new Error('Invalid ID format');
        }
        // Use delete method to remove directly by ID
        const deleteResult = await this.patientRepository.delete(id);

        // Check if any rows were affected; if not, it means the patient was not found
        if (deleteResult.affected === 0) {
            throw new NotFoundError(`Patient with ID ${id} not found for deletion`);
        }
        // Deletion successful, no return value needed
    }
}

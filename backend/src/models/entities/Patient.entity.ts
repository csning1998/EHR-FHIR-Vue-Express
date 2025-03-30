// backend/src/models/entities/Patient.entity.ts
import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
// Optionally import the Patient interface for reference, though the Entity defines the structure
// import type { Patient as IPatient } from '@/types/patient';

/**
 * Represents a patient entity mapped to the 'patients' table in the database.
 * Inherits BaseEntity for convenient methods like save and remove.
 */
@Entity('patients') // Specifies the table name as 'patients'
export class PatientEntity extends BaseEntity {
    /**
     * The unique identifier for the patient, auto-incremented.
     */
    @PrimaryGeneratedColumn() // Maps to id BIGSERIAL PRIMARY KEY
    id!: number;

    /**
     * The patient's personal identification number (PID), up to 10 characters.
     */
    @Column({ name: 'pid', length: 10 }) // Maps to pid column
    pid!: string;

    /**
     * Indicates whether the patient record is active. Defaults to true.
     */
    @Column({ default: true })
    active!: boolean;

    /**
     * The patient's family name, up to 50 characters.
     */
    @Column({ name: 'family_name', length: 50 })
    familyName!: string;

    /**
     * The patient's given name, up to 50 characters.
     */
    @Column({ name: 'given_name', length: 50 })
    givenName!: string;

    /**
     * The patient's contact number, up to 20 characters.
     */
    @Column({ length: 20 })
    telecom!: string;

    /**
     * The patient's gender, up to 10 characters.
     */
    @Column({ length: 10 })
    gender!: string;

    /**
     * The patient's date of birth, stored as a date.
     */
    @Column({ type: 'date' })
    birthday!: string;

    /**
     * The patient's address, up to 100 characters.
     */
    @Column({ length: 100 })
    address!: string;

    /**
     * The patient's email address, up to 100 characters. Optional.
     */
    @Column({ nullable: true, length: 100 })
    email?: string; // Optional, maps to NULL

    /**
     * The patient's postal code, up to 10 characters. Optional.
     */
    @Column({ name: 'postal_code', nullable: true, length: 10 })
    postalCode?: string;

    /**
     * The patient's country, up to 50 characters. Optional.
     */
    @Column({ nullable: true, length: 50 })
    country?: string;

    /**
     * The patient's preferred language, up to 50 characters. Optional.
     */
    @Column({ name: 'preferred_language', nullable: true, length: 50 })
    preferredLanguage?: string;

    /**
     * The name of the patient's emergency contact, up to 50 characters. Optional.
     */
    @Column({ name: 'emergency_contact_name', nullable: true, length: 50 })
    emergencyContactName?: string;

    /**
     * The relationship of the emergency contact to the patient, up to 50 characters. Optional.
     */
    @Column({ name: 'emergency_contact_relationship', nullable: true, length: 50 })
    emergencyContactRelationship?: string;

    /**
     * The phone number of the emergency contact, up to 20 characters. Optional.
     */
    @Column({ name: 'emergency_contact_phone', nullable: true, length: 20 })
    emergencyContactPhone?: string;
}

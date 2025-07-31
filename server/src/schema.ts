
import { z } from 'zod';

// Enums for medical specialties and queue status
export const medicalSpecialtyEnum = z.enum([
  'GENERAL_MEDICINE',
  'CARDIOLOGY',
  'DERMATOLOGY',
  'PEDIATRICS',
  'ORTHOPEDICS',
  'NEUROLOGY',
  'GYNECOLOGY',
  'PSYCHIATRY',
  'OPHTHALMOLOGY',
  'ENT'
]);

export const queueStatusEnum = z.enum([
  'WAITING',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

export const doctorStatusEnum = z.enum([
  'AVAILABLE',
  'BUSY',
  'OFFLINE'
]);

// Doctor schema
export const doctorSchema = z.object({
  id: z.number(),
  name: z.string(),
  specialty: medicalSpecialtyEnum,
  room_number: z.string().nullable(),
  status: doctorStatusEnum,
  created_at: z.coerce.date()
});

export type Doctor = z.infer<typeof doctorSchema>;

// Queue entry schema
export const queueEntrySchema = z.object({
  id: z.number(),
  patient_id: z.string(),
  specialty: medicalSpecialtyEnum,
  queue_number: z.number(),
  status: queueStatusEnum,
  doctor_id: z.number().nullable(),
  room_number: z.string().nullable(),
  created_at: z.coerce.date(),
  called_at: z.coerce.date().nullable(),
  completed_at: z.coerce.date().nullable()
});

export type QueueEntry = z.infer<typeof queueEntrySchema>;

// Display board entry schema
export const displayBoardEntrySchema = z.object({
  id: z.number(),
  patient_id: z.string(),
  room_number: z.string(),
  specialty: medicalSpecialtyEnum,
  status: queueStatusEnum,
  created_at: z.coerce.date()
});

export type DisplayBoardEntry = z.infer<typeof displayBoardEntrySchema>;

// Input schemas for creating queue entries
export const joinQueueInputSchema = z.object({
  patient_id: z.string().min(1, "Patient ID is required"),
  specialty: medicalSpecialtyEnum
});

export type JoinQueueInput = z.infer<typeof joinQueueInputSchema>;

// Input schemas for doctor operations
export const doctorLoginInputSchema = z.object({
  doctor_id: z.number(),
  room_number: z.string().min(1, "Room number is required")
});

export type DoctorLoginInput = z.infer<typeof doctorLoginInputSchema>;

export const setDoctorRoomInputSchema = z.object({
  doctor_id: z.number(),
  room_number: z.string().min(1, "Room number is required")
});

export type SetDoctorRoomInput = z.infer<typeof setDoctorRoomInputSchema>;

export const callNextPatientInputSchema = z.object({
  doctor_id: z.number()
});

export type CallNextPatientInput = z.infer<typeof callNextPatientInputSchema>;

export const completePatientInputSchema = z.object({
  doctor_id: z.number(),
  queue_entry_id: z.number()
});

export type CompletePatientInput = z.infer<typeof completePatientInputSchema>;

// Response schemas
export const queueStatusResponseSchema = z.object({
  specialty: medicalSpecialtyEnum,
  total_waiting: z.number(),
  current_queue_number: z.number(),
  estimated_wait_time: z.number() // in minutes
});

export type QueueStatusResponse = z.infer<typeof queueStatusResponseSchema>;

export const patientQueueInfoSchema = z.object({
  queue_entry: queueEntrySchema,
  position_in_queue: z.number(),
  estimated_wait_time: z.number() // in minutes
});

export type PatientQueueInfo = z.infer<typeof patientQueueInfoSchema>;

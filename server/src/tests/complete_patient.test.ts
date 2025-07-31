
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueEntriesTable, doctorsTable, displayBoardEntriesTable } from '../db/schema';
import { type CompletePatientInput } from '../schema';
import { completePatient } from '../handlers/complete_patient';
import { eq } from 'drizzle-orm';

describe('completePatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should complete a patient consultation', async () => {
    // Create a doctor
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Smith',
        specialty: 'GENERAL_MEDICINE',
        room_number: 'ROOM-1',
        status: 'BUSY'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    // Create a queue entry in progress
    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P001',
        specialty: 'GENERAL_MEDICINE',
        queue_number: 1,
        status: 'IN_PROGRESS',
        doctor_id: doctor.id,
        room_number: 'ROOM-1',
        called_at: new Date()
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    // Create display board entry
    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: 'P001',
        room_number: 'ROOM-1',
        specialty: 'GENERAL_MEDICINE',
        status: 'IN_PROGRESS'
      })
      .execute();

    const input: CompletePatientInput = {
      doctor_id: doctor.id,
      queue_entry_id: queueEntry.id
    };

    const result = await completePatient(input);

    // Verify queue entry is completed
    expect(result.id).toEqual(queueEntry.id);
    expect(result.status).toEqual('COMPLETED');
    expect(result.completed_at).toBeInstanceOf(Date);
    expect(result.doctor_id).toEqual(doctor.id);
    expect(result.patient_id).toEqual('P001');
  });

  it('should update queue entry in database', async () => {
    // Create doctor and queue entry
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Johnson',
        specialty: 'CARDIOLOGY',
        status: 'BUSY'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P002',
        specialty: 'CARDIOLOGY',
        queue_number: 2,
        status: 'IN_PROGRESS',
        doctor_id: doctor.id,
        room_number: 'ROOM-2'
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    const input: CompletePatientInput = {
      doctor_id: doctor.id,
      queue_entry_id: queueEntry.id
    };

    await completePatient(input);

    // Verify database state
    const updatedEntries = await db.select()
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.id, queueEntry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    expect(updatedEntries[0].status).toEqual('COMPLETED');
    expect(updatedEntries[0].completed_at).toBeInstanceOf(Date);
  });

  it('should remove entry from display board', async () => {
    // Create doctor and queue entry
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Brown',
        specialty: 'PEDIATRICS',
        status: 'BUSY'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P003',
        specialty: 'PEDIATRICS',
        queue_number: 1,
        status: 'IN_PROGRESS',
        doctor_id: doctor.id
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    // Create display board entry
    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: 'P003',
        room_number: 'ROOM-3',
        specialty: 'PEDIATRICS',
        status: 'IN_PROGRESS'
      })
      .execute();

    const input: CompletePatientInput = {
      doctor_id: doctor.id,
      queue_entry_id: queueEntry.id
    };

    await completePatient(input);

    // Verify display board entry is removed
    const displayEntries = await db.select()
      .from(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, 'P003'))
      .execute();

    expect(displayEntries).toHaveLength(0);
  });

  it('should update doctor status to available', async () => {
    // Create doctor with busy status
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Wilson',
        specialty: 'ORTHOPEDICS',
        status: 'BUSY'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P004',
        specialty: 'ORTHOPEDICS',
        queue_number: 1,
        status: 'IN_PROGRESS',
        doctor_id: doctor.id
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    const input: CompletePatientInput = {
      doctor_id: doctor.id,
      queue_entry_id: queueEntry.id
    };

    await completePatient(input);

    // Verify doctor status is updated
    const updatedDoctors = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, doctor.id))
      .execute();

    expect(updatedDoctors).toHaveLength(1);
    expect(updatedDoctors[0].status).toEqual('AVAILABLE');
  });

  it('should throw error for non-existent queue entry', async () => {
    const input: CompletePatientInput = {
      doctor_id: 999,
      queue_entry_id: 999
    };

    expect(completePatient(input)).rejects.toThrow(/queue entry not found/i);
  });

  it('should throw error when queue entry not assigned to doctor', async () => {
    // Create two doctors
    const doctor1Result = await db.insert(doctorsTable)
      .values({
        name: 'Dr. First',
        specialty: 'GENERAL_MEDICINE',
        status: 'BUSY'
      })
      .returning()
      .execute();

    const doctor2Result = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Second',
        specialty: 'GENERAL_MEDICINE',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor1 = doctor1Result[0];
    const doctor2 = doctor2Result[0];

    // Create queue entry assigned to doctor1
    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P005',
        specialty: 'GENERAL_MEDICINE',
        queue_number: 1,
        status: 'IN_PROGRESS',
        doctor_id: doctor1.id
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    // Try to complete with doctor2 (wrong doctor)
    const input: CompletePatientInput = {
      doctor_id: doctor2.id,
      queue_entry_id: queueEntry.id
    };

    expect(completePatient(input)).rejects.toThrow(/queue entry not found/i);
  });
});

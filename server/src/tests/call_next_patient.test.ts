
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { doctorsTable, queueEntriesTable, displayBoardEntriesTable } from '../db/schema';
import { type CallNextPatientInput } from '../schema';
import { callNextPatient } from '../handlers/call_next_patient';
import { eq, and } from 'drizzle-orm';

describe('callNextPatient', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should call the next patient in the queue', async () => {
    // Create a doctor with room assigned
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Smith',
        specialty: 'CARDIOLOGY',
        room_number: 'Room 101',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    // Create queue entries - multiple patients waiting
    await db.insert(queueEntriesTable)
      .values([
        {
          patient_id: 'P001',
          specialty: 'CARDIOLOGY',
          queue_number: 1,
          status: 'WAITING'
        },
        {
          patient_id: 'P002',
          specialty: 'CARDIOLOGY',
          queue_number: 2,
          status: 'WAITING'
        }
      ])
      .execute();

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    const result = await callNextPatient(input);

    // Should return the first patient in queue
    expect(result).not.toBeNull();
    expect(result!.patient_id).toEqual('P001');
    expect(result!.status).toEqual('CALLED');
    expect(result!.doctor_id).toEqual(doctor.id);
    expect(result!.room_number).toEqual('Room 101');
    expect(result!.called_at).toBeInstanceOf(Date);
  });

  it('should update the database correctly', async () => {
    // Create doctor and patient
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Jones',
        specialty: 'PEDIATRICS',
        room_number: 'Room 202',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const queueResult = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'P003',
        specialty: 'PEDIATRICS',
        queue_number: 1,
        status: 'WAITING'
      })
      .returning()
      .execute();

    const queueEntry = queueResult[0];

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    await callNextPatient(input);

    // Check queue entry was updated
    const updatedEntry = await db.select()
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.id, queueEntry.id))
      .execute();

    expect(updatedEntry[0].status).toEqual('CALLED');
    expect(updatedEntry[0].doctor_id).toEqual(doctor.id);
    expect(updatedEntry[0].room_number).toEqual('Room 202');
    expect(updatedEntry[0].called_at).toBeInstanceOf(Date);

    // Check doctor status was updated to BUSY
    const updatedDoctor = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, doctor.id))
      .execute();

    expect(updatedDoctor[0].status).toEqual('BUSY');

    // Check display board entry was created
    const displayEntries = await db.select()
      .from(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, 'P003'))
      .execute();

    expect(displayEntries).toHaveLength(1);
    expect(displayEntries[0].room_number).toEqual('Room 202');
    expect(displayEntries[0].specialty).toEqual('PEDIATRICS');
    expect(displayEntries[0].status).toEqual('CALLED');
  });

  it('should return null when no patients are waiting', async () => {
    // Create doctor with no waiting patients
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Brown',
        specialty: 'ORTHOPEDICS',
        room_number: 'Room 303',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    const result = await callNextPatient(input);

    expect(result).toBeNull();
  });

  it('should call patients in correct queue order', async () => {
    // Create doctor
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Wilson',
        specialty: 'NEUROLOGY',
        room_number: 'Room 404',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    // Create patients with different queue numbers
    await db.insert(queueEntriesTable)
      .values([
        {
          patient_id: 'P005',
          specialty: 'NEUROLOGY',
          queue_number: 3,
          status: 'WAITING'
        },
        {
          patient_id: 'P004',
          specialty: 'NEUROLOGY',
          queue_number: 1,
          status: 'WAITING'
        },
        {
          patient_id: 'P006',
          specialty: 'NEUROLOGY',
          queue_number: 2,
          status: 'WAITING'
        }
      ])
      .execute();

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    const result = await callNextPatient(input);

    // Should call P004 first (queue_number 1)
    expect(result!.patient_id).toEqual('P004');
  });

  it('should only call patients with matching specialty', async () => {
    // Create doctor with CARDIOLOGY specialty
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Taylor',
        specialty: 'CARDIOLOGY',
        room_number: 'Room 505',
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    // Create patients with different specialties
    await db.insert(queueEntriesTable)
      .values([
        {
          patient_id: 'P007',
          specialty: 'PEDIATRICS',
          queue_number: 1,
          status: 'WAITING'
        },
        {
          patient_id: 'P008',
          specialty: 'CARDIOLOGY',
          queue_number: 2,
          status: 'WAITING'
        }
      ])
      .execute();

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    const result = await callNextPatient(input);

    // Should call P008 (CARDIOLOGY patient), not P007 (PEDIATRICS)
    expect(result!.patient_id).toEqual('P008');
  });

  it('should throw error for non-existent doctor', async () => {
    const input: CallNextPatientInput = {
      doctor_id: 999 // Non-existent doctor
    };

    expect(callNextPatient(input)).rejects.toThrow(/doctor not found/i);
  });

  it('should throw error when doctor has no room assigned', async () => {
    // Create doctor without room
    const doctorResult = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Davis',
        specialty: 'DERMATOLOGY',
        room_number: null, // No room assigned
        status: 'AVAILABLE'
      })
      .returning()
      .execute();

    const doctor = doctorResult[0];

    const input: CallNextPatientInput = {
      doctor_id: doctor.id
    };

    expect(callNextPatient(input)).rejects.toThrow(/room/i);
  });
});

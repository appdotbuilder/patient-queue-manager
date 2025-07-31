
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueEntriesTable } from '../db/schema';
import { type JoinQueueInput } from '../schema';
import { joinQueue } from '../handlers/join_queue';
import { eq, and } from 'drizzle-orm';

const testInput: JoinQueueInput = {
  patient_id: 'PATIENT123',
  specialty: 'GENERAL_MEDICINE'
};

describe('joinQueue', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a queue entry with correct data', async () => {
    const result = await joinQueue(testInput);

    expect(result.patient_id).toEqual('PATIENT123');
    expect(result.specialty).toEqual('GENERAL_MEDICINE');
    expect(result.queue_number).toEqual(1);
    expect(result.status).toEqual('WAITING');
    expect(result.doctor_id).toBeNull();
    expect(result.room_number).toBeNull();
    expect(result.called_at).toBeNull();
    expect(result.completed_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should save queue entry to database', async () => {
    const result = await joinQueue(testInput);

    const queueEntries = await db.select()
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.id, result.id))
      .execute();

    expect(queueEntries).toHaveLength(1);
    expect(queueEntries[0].patient_id).toEqual('PATIENT123');
    expect(queueEntries[0].specialty).toEqual('GENERAL_MEDICINE');
    expect(queueEntries[0].queue_number).toEqual(1);
    expect(queueEntries[0].status).toEqual('WAITING');
  });

  it('should assign sequential queue numbers for same specialty', async () => {
    // Join first patient
    const result1 = await joinQueue(testInput);
    expect(result1.queue_number).toEqual(1);

    // Join second patient for same specialty
    const input2: JoinQueueInput = {
      patient_id: 'PATIENT456',
      specialty: 'GENERAL_MEDICINE'
    };
    const result2 = await joinQueue(input2);
    expect(result2.queue_number).toEqual(2);

    // Join third patient for same specialty
    const input3: JoinQueueInput = {
      patient_id: 'PATIENT789',
      specialty: 'GENERAL_MEDICINE'
    };
    const result3 = await joinQueue(input3);
    expect(result3.queue_number).toEqual(3);
  });

  it('should assign separate queue numbers for different specialties', async () => {
    // Join patient for general medicine
    const result1 = await joinQueue(testInput);
    expect(result1.queue_number).toEqual(1);

    // Join patient for cardiology
    const cardiologyInput: JoinQueueInput = {
      patient_id: 'PATIENT456',
      specialty: 'CARDIOLOGY'
    };
    const result2 = await joinQueue(cardiologyInput);
    expect(result2.queue_number).toEqual(1); // Should start from 1 for new specialty

    // Join another patient for general medicine
    const generalMedicineInput: JoinQueueInput = {
      patient_id: 'PATIENT789',
      specialty: 'GENERAL_MEDICINE'
    };
    const result3 = await joinQueue(generalMedicineInput);
    expect(result3.queue_number).toEqual(2); // Should continue from previous general medicine queue
  });

  it('should handle multiple patients joining different specialties', async () => {
    // Create entries for multiple specialties
    const patients = [
      { patient_id: 'PAT001', specialty: 'GENERAL_MEDICINE' as const },
      { patient_id: 'PAT002', specialty: 'CARDIOLOGY' as const },
      { patient_id: 'PAT003', specialty: 'GENERAL_MEDICINE' as const },
      { patient_id: 'PAT004', specialty: 'PEDIATRICS' as const },
      { patient_id: 'PAT005', specialty: 'CARDIOLOGY' as const }
    ];

    const results = [];
    for (const patient of patients) {
      const result = await joinQueue(patient);
      results.push(result);
    }

    // Verify queue numbers per specialty
    expect(results[0].queue_number).toEqual(1); // First general medicine
    expect(results[1].queue_number).toEqual(1); // First cardiology
    expect(results[2].queue_number).toEqual(2); // Second general medicine
    expect(results[3].queue_number).toEqual(1); // First pediatrics
    expect(results[4].queue_number).toEqual(2); // Second cardiology

    // Verify all entries are saved correctly
    const allEntries = await db.select()
      .from(queueEntriesTable)
      .execute();

    expect(allEntries).toHaveLength(5);

    // Check general medicine entries
    const generalMedicineEntries = allEntries.filter(entry => entry.specialty === 'GENERAL_MEDICINE');
    expect(generalMedicineEntries).toHaveLength(2);
    expect(generalMedicineEntries.map(e => e.queue_number).sort()).toEqual([1, 2]);

    // Check cardiology entries
    const cardiologyEntries = allEntries.filter(entry => entry.specialty === 'CARDIOLOGY');
    expect(cardiologyEntries).toHaveLength(2);
    expect(cardiologyEntries.map(e => e.queue_number).sort()).toEqual([1, 2]);
  });
});

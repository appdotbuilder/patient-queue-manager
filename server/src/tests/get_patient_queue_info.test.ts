
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueEntriesTable } from '../db/schema';
import { getPatientQueueInfo } from '../handlers/get_patient_queue_info';

describe('getPatientQueueInfo', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null when patient is not in queue', async () => {
    const result = await getPatientQueueInfo('patient123');
    expect(result).toBeNull();
  });

  it('should return queue info for patient in first position', async () => {
    // Create a queue entry for the patient
    await db.insert(queueEntriesTable)
      .values({
        patient_id: 'patient123',
        specialty: 'CARDIOLOGY',
        queue_number: 1,
        status: 'WAITING'
      })
      .execute();

    const result = await getPatientQueueInfo('patient123');

    expect(result).not.toBeNull();
    expect(result!.queue_entry.patient_id).toBe('patient123');
    expect(result!.queue_entry.specialty).toBe('CARDIOLOGY');
    expect(result!.queue_entry.queue_number).toBe(1);
    expect(result!.queue_entry.status).toBe('WAITING');
    expect(result!.position_in_queue).toBe(1);
    expect(result!.estimated_wait_time).toBe(0);
  });

  it('should calculate correct position when patient is third in queue', async () => {
    // Create multiple queue entries in the same specialty
    await db.insert(queueEntriesTable)
      .values([
        {
          patient_id: 'patient001',
          specialty: 'CARDIOLOGY',
          queue_number: 1,
          status: 'WAITING'
        },
        {
          patient_id: 'patient002',
          specialty: 'CARDIOLOGY',
          queue_number: 2,
          status: 'WAITING'
        },
        {
          patient_id: 'patient123',
          specialty: 'CARDIOLOGY',
          queue_number: 3,
          status: 'WAITING'
        }
      ])
      .execute();

    const result = await getPatientQueueInfo('patient123');

    expect(result).not.toBeNull();
    expect(result!.position_in_queue).toBe(3);
    expect(result!.estimated_wait_time).toBe(30); // 2 patients ahead * 15 minutes
  });

  it('should only count waiting patients in same specialty', async () => {
    // Create queue entries in different specialties and statuses
    await db.insert(queueEntriesTable)
      .values([
        {
          patient_id: 'patient001',
          specialty: 'CARDIOLOGY',
          queue_number: 1,
          status: 'IN_PROGRESS' // Different status - should not count
        },
        {
          patient_id: 'patient002',
          specialty: 'DERMATOLOGY',
          queue_number: 1,
          status: 'WAITING' // Different specialty - should not count
        },
        {
          patient_id: 'patient003',
          specialty: 'CARDIOLOGY',
          queue_number: 2,
          status: 'WAITING' // Same specialty, waiting - should count
        },
        {
          patient_id: 'patient123',
          specialty: 'CARDIOLOGY',
          queue_number: 3,
          status: 'WAITING'
        }
      ])
      .execute();

    const result = await getPatientQueueInfo('patient123');

    expect(result).not.toBeNull();
    expect(result!.position_in_queue).toBe(2); // Only patient003 is ahead
    expect(result!.estimated_wait_time).toBe(15); // 1 patient ahead * 15 minutes
  });

  it('should return null for patient with completed status', async () => {
    // Create a completed queue entry
    await db.insert(queueEntriesTable)
      .values({
        patient_id: 'patient123',
        specialty: 'CARDIOLOGY',
        queue_number: 1,
        status: 'COMPLETED'
      })
      .execute();

    const result = await getPatientQueueInfo('patient123');
    expect(result).toBeNull();
  });

  it('should return null for patient with cancelled status', async () => {
    // Create a cancelled queue entry
    await db.insert(queueEntriesTable)
      .values({
        patient_id: 'patient123',
        specialty: 'CARDIOLOGY',
        queue_number: 1,
        status: 'CANCELLED'
      })
      .execute();

    const result = await getPatientQueueInfo('patient123');
    expect(result).toBeNull();
  });
});

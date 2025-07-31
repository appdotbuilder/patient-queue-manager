
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { doctorsTable, queueEntriesTable } from '../db/schema';
import { getQueueStatus } from '../handlers/get_queue_status';

describe('getQueueStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no queue entries exist', async () => {
    const result = await getQueueStatus();
    expect(result).toEqual([]);
  });

  it('should return queue status for single specialty', async () => {
    // Create some queue entries for CARDIOLOGY
    await db.insert(queueEntriesTable).values([
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
    ]).execute();

    const result = await getQueueStatus();

    expect(result).toHaveLength(1);
    expect(result[0].specialty).toBe('CARDIOLOGY');
    expect(result[0].total_waiting).toBe(2);
    expect(result[0].current_queue_number).toBe(2);
    expect(result[0].estimated_wait_time).toBe(30); // 2 patients * 15 minutes
  });

  it('should return queue status for multiple specialties', async () => {
    // Create queue entries for different specialties
    await db.insert(queueEntriesTable).values([
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
      },
      {
        patient_id: 'P003',
        specialty: 'DERMATOLOGY',
        queue_number: 1,
        status: 'WAITING'
      }
    ]).execute();

    const result = await getQueueStatus();

    expect(result).toHaveLength(2);
    
    const cardiologyStatus = result.find(s => s.specialty === 'CARDIOLOGY');
    expect(cardiologyStatus).toBeDefined();
    expect(cardiologyStatus!.total_waiting).toBe(2);
    expect(cardiologyStatus!.current_queue_number).toBe(2);
    expect(cardiologyStatus!.estimated_wait_time).toBe(30);

    const dermatologyStatus = result.find(s => s.specialty === 'DERMATOLOGY');
    expect(dermatologyStatus).toBeDefined();
    expect(dermatologyStatus!.total_waiting).toBe(1);
    expect(dermatologyStatus!.current_queue_number).toBe(1);
    expect(dermatologyStatus!.estimated_wait_time).toBe(15);
  });

  it('should only count WAITING patients', async () => {
    // Create queue entries with different statuses
    await db.insert(queueEntriesTable).values([
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
        status: 'CALLED'
      },
      {
        patient_id: 'P003',
        specialty: 'CARDIOLOGY',
        queue_number: 3,
        status: 'COMPLETED'
      },
      {
        patient_id: 'P004',
        specialty: 'CARDIOLOGY',
        queue_number: 4,
        status: 'WAITING'
      }
    ]).execute();

    const result = await getQueueStatus();

    expect(result).toHaveLength(1);
    expect(result[0].specialty).toBe('CARDIOLOGY');
    expect(result[0].total_waiting).toBe(2); // Only P001 and P004 are waiting
    expect(result[0].current_queue_number).toBe(4); // Max queue number among waiting patients
    expect(result[0].estimated_wait_time).toBe(30);
  });

  it('should handle specialty with no waiting patients', async () => {
    // Create queue entries but all are completed
    await db.insert(queueEntriesTable).values([
      {
        patient_id: 'P001',
        specialty: 'CARDIOLOGY',
        queue_number: 1,
        status: 'COMPLETED'
      },
      {
        patient_id: 'P002',
        specialty: 'DERMATOLOGY',
        queue_number: 1,
        status: 'WAITING'
      }
    ]).execute();

    const result = await getQueueStatus();

    expect(result).toHaveLength(1);
    expect(result[0].specialty).toBe('DERMATOLOGY');
    expect(result[0].total_waiting).toBe(1);
    expect(result[0].current_queue_number).toBe(1);
    expect(result[0].estimated_wait_time).toBe(15);
  });
});

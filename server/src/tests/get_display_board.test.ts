
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { displayBoardEntriesTable } from '../db/schema';
import { getDisplayBoard } from '../handlers/get_display_board';

describe('getDisplayBoard', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no display board entries exist', async () => {
    const result = await getDisplayBoard();
    expect(result).toEqual([]);
  });

  it('should return all display board entries', async () => {
    // Create test display board entries
    await db.insert(displayBoardEntriesTable)
      .values([
        {
          patient_id: 'PATIENT001',
          room_number: 'Room A1',
          specialty: 'CARDIOLOGY',
          status: 'CALLED'
        },
        {
          patient_id: 'PATIENT002',
          room_number: 'Room B2',
          specialty: 'DERMATOLOGY',
          status: 'IN_PROGRESS'
        }
      ])
      .execute();

    const result = await getDisplayBoard();

    expect(result).toHaveLength(2);
    
    // Sort results by patient_id for consistent testing
    const sortedResult = result.sort((a, b) => a.patient_id.localeCompare(b.patient_id));
    
    // Verify first entry (PATIENT001)
    expect(sortedResult[0].patient_id).toEqual('PATIENT001');
    expect(sortedResult[0].room_number).toEqual('Room A1');
    expect(sortedResult[0].specialty).toEqual('CARDIOLOGY');
    expect(sortedResult[0].status).toEqual('CALLED');
    expect(sortedResult[0].id).toBeDefined();
    expect(sortedResult[0].created_at).toBeInstanceOf(Date);

    // Verify second entry (PATIENT002)
    expect(sortedResult[1].patient_id).toEqual('PATIENT002');
    expect(sortedResult[1].room_number).toEqual('Room B2');
    expect(sortedResult[1].specialty).toEqual('DERMATOLOGY');
    expect(sortedResult[1].status).toEqual('IN_PROGRESS');
    expect(sortedResult[1].id).toBeDefined();
    expect(sortedResult[1].created_at).toBeInstanceOf(Date);
  });

  it('should return entries ordered by most recent first', async () => {
    // Create entries with slight time delay to ensure ordering
    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: 'PATIENT001',
        room_number: 'Room A1',
        specialty: 'CARDIOLOGY',
        status: 'CALLED'
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: 'PATIENT002',
        room_number: 'Room B2',
        specialty: 'DERMATOLOGY',
        status: 'IN_PROGRESS'
      })
      .execute();

    const result = await getDisplayBoard();

    expect(result).toHaveLength(2);
    
    // Most recent entry should be first
    expect(result[0].patient_id).toEqual('PATIENT002');
    expect(result[1].patient_id).toEqual('PATIENT001');
    
    // Verify timestamps are in descending order
    expect(result[0].created_at >= result[1].created_at).toBe(true);
  });

  it('should handle different specialties and statuses', async () => {
    await db.insert(displayBoardEntriesTable)
      .values([
        {
          patient_id: 'PATIENT001',
          room_number: 'Room 101',
          specialty: 'GENERAL_MEDICINE',
          status: 'WAITING'
        },
        {
          patient_id: 'PATIENT002',
          room_number: 'Room 202',
          specialty: 'PEDIATRICS',
          status: 'COMPLETED'
        },
        {
          patient_id: 'PATIENT003',
          room_number: 'Room 303',
          specialty: 'ORTHOPEDICS',
          status: 'CANCELLED'
        }
      ])
      .execute();

    const result = await getDisplayBoard();

    expect(result).toHaveLength(3);
    
    // Verify all different specialties and statuses are handled
    const specialties = result.map(entry => entry.specialty);
    const statuses = result.map(entry => entry.status);
    
    expect(specialties).toContain('GENERAL_MEDICINE');
    expect(specialties).toContain('PEDIATRICS');
    expect(specialties).toContain('ORTHOPEDICS');
    
    expect(statuses).toContain('WAITING');
    expect(statuses).toContain('COMPLETED');
    expect(statuses).toContain('CANCELLED');
  });
});

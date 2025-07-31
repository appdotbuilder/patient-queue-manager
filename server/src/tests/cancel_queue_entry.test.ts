
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { queueEntriesTable, displayBoardEntriesTable, doctorsTable } from '../db/schema';
import { cancelQueueEntry } from '../handlers/cancel_queue_entry';
import { eq } from 'drizzle-orm';

describe('cancelQueueEntry', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should cancel a queue entry', async () => {
    // Create a test queue entry
    const queueEntries = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'PATIENT123',
        specialty: 'GENERAL_MEDICINE',
        queue_number: 1,
        status: 'WAITING'
      })
      .returning()
      .execute();

    const queueEntry = queueEntries[0];

    const result = await cancelQueueEntry(queueEntry.id);

    // Verify the result
    expect(result.id).toEqual(queueEntry.id);
    expect(result.patient_id).toEqual('PATIENT123');
    expect(result.specialty).toEqual('GENERAL_MEDICINE');
    expect(result.status).toEqual('CANCELLED');
    expect(result.queue_number).toEqual(1);
  });

  it('should update queue entry status in database', async () => {
    // Create a test queue entry
    const queueEntries = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'PATIENT456',
        specialty: 'CARDIOLOGY',
        queue_number: 2,
        status: 'WAITING'
      })
      .returning()
      .execute();

    const queueEntry = queueEntries[0];

    await cancelQueueEntry(queueEntry.id);

    // Verify the database was updated
    const updatedEntries = await db.select()
      .from(queueEntriesTable)
      .where(eq(queueEntriesTable.id, queueEntry.id))
      .execute();

    expect(updatedEntries).toHaveLength(1);
    expect(updatedEntries[0].status).toEqual('CANCELLED');
    expect(updatedEntries[0].patient_id).toEqual('PATIENT456');
  });

  it('should remove entry from display board if present', async () => {
    // Create a test queue entry
    const queueEntries = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'PATIENT789',
        specialty: 'PEDIATRICS',
        queue_number: 3,
        status: 'CALLED'
      })
      .returning()
      .execute();

    const queueEntry = queueEntries[0];

    // Create a display board entry for the same patient
    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: 'PATIENT789',
        room_number: 'ROOM101',
        specialty: 'PEDIATRICS',
        status: 'CALLED'
      })
      .execute();

    // Verify display board entry exists before cancellation
    const displayEntriesBefore = await db.select()
      .from(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, 'PATIENT789'))
      .execute();

    expect(displayEntriesBefore).toHaveLength(1);

    await cancelQueueEntry(queueEntry.id);

    // Verify display board entry was removed
    const displayEntriesAfter = await db.select()
      .from(displayBoardEntriesTable)
      .where(eq(displayBoardEntriesTable.patient_id, 'PATIENT789'))
      .execute();

    expect(displayEntriesAfter).toHaveLength(0);
  });

  it('should throw error for non-existent queue entry', async () => {
    const nonExistentId = 99999;

    expect(cancelQueueEntry(nonExistentId)).rejects.toThrow(/not found/i);
  });

  it('should handle queue entry without display board entry', async () => {
    // Create a test queue entry without corresponding display board entry
    const queueEntries = await db.insert(queueEntriesTable)
      .values({
        patient_id: 'PATIENT999',
        specialty: 'DERMATOLOGY',
        queue_number: 4,
        status: 'WAITING'
      })
      .returning()
      .execute();

    const queueEntry = queueEntries[0];

    // Should not throw error even if no display board entry exists
    const result = await cancelQueueEntry(queueEntry.id);

    expect(result.status).toEqual('CANCELLED');
    expect(result.patient_id).toEqual('PATIENT999');
  });
});

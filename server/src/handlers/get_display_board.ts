
import { db } from '../db';
import { displayBoardEntriesTable } from '../db/schema';
import { type DisplayBoardEntry } from '../schema';
import { desc } from 'drizzle-orm';

export const getDisplayBoard = async (): Promise<DisplayBoardEntry[]> => {
  try {
    // Get all display board entries ordered by most recent first 
    const results = await db.select()
      .from(displayBoardEntriesTable)
      .orderBy(desc(displayBoardEntriesTable.created_at))
      .execute();

    return results;
  } catch (error) {
    console.error('Failed to get display board entries:', error);
    throw error;
  }
};

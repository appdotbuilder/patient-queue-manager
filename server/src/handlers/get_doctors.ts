
import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { type Doctor } from '../schema';

export const getDoctors = async (): Promise<Doctor[]> => {
  try {
    const results = await db.select()
      .from(doctorsTable)
      .execute();

    return results;
  } catch (error) {
    console.error('Get doctors failed:', error);
    throw error;
  }
};


import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { type SetDoctorRoomInput, type Doctor } from '../schema';
import { eq } from 'drizzle-orm';

export const setDoctorRoom = async (input: SetDoctorRoomInput): Promise<Doctor> => {
  try {
    // Update doctor's room number
    const result = await db.update(doctorsTable)
      .set({
        room_number: input.room_number
      })
      .where(eq(doctorsTable.id, input.doctor_id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Doctor with ID ${input.doctor_id} not found`);
    }

    return result[0];
  } catch (error) {
    console.error('Doctor room assignment failed:', error);
    throw error;
  }
};

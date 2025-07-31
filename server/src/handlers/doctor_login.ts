
import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { type DoctorLoginInput, type Doctor } from '../schema';
import { eq } from 'drizzle-orm';

export const doctorLogin = async (input: DoctorLoginInput): Promise<Doctor> => {
  try {
    // First, verify the doctor exists
    const existingDoctor = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, input.doctor_id))
      .execute();

    if (existingDoctor.length === 0) {
      throw new Error(`Doctor with ID ${input.doctor_id} not found`);
    }

    // Update doctor's room number and status
    const result = await db.update(doctorsTable)
      .set({
        room_number: input.room_number,
        status: 'AVAILABLE'
      })
      .where(eq(doctorsTable.id, input.doctor_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Doctor login failed:', error);
    throw error;
  }
};

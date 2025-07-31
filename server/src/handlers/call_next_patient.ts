
import { db } from '../db';
import { doctorsTable, queueEntriesTable, displayBoardEntriesTable } from '../db/schema';
import { type CallNextPatientInput, type QueueEntry } from '../schema';
import { eq, and, desc, asc } from 'drizzle-orm';

export const callNextPatient = async (input: CallNextPatientInput): Promise<QueueEntry | null> => {
  try {
    // First, get the doctor to verify they exist and get their specialty
    const doctor = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, input.doctor_id))
      .execute();

    if (doctor.length === 0) {
      throw new Error('Doctor not found');
    }

    const doctorInfo = doctor[0];

    if (!doctorInfo.room_number) {
      throw new Error('Doctor must be assigned to a room before calling patients');
    }

    // Find the next waiting patient for this doctor's specialty
    const nextPatients = await db.select()
      .from(queueEntriesTable)
      .where(
        and(
          eq(queueEntriesTable.specialty, doctorInfo.specialty),
          eq(queueEntriesTable.status, 'WAITING')
        )
      )
      .orderBy(asc(queueEntriesTable.queue_number))
      .limit(1)
      .execute();

    if (nextPatients.length === 0) {
      return null; // No patients waiting
    }

    const nextPatient = nextPatients[0];

    // Update the queue entry to CALLED status
    const updatedEntries = await db.update(queueEntriesTable)
      .set({
        status: 'CALLED',
        doctor_id: input.doctor_id,
        room_number: doctorInfo.room_number,
        called_at: new Date()
      })
      .where(eq(queueEntriesTable.id, nextPatient.id))
      .returning()
      .execute();

    // Update the display board with this patient's information
    await db.insert(displayBoardEntriesTable)
      .values({
        patient_id: nextPatient.patient_id,
        room_number: doctorInfo.room_number,
        specialty: nextPatient.specialty,
        status: 'CALLED'
      })
      .execute();

    // Update doctor status to BUSY
    await db.update(doctorsTable)
      .set({
        status: 'BUSY'
      })
      .where(eq(doctorsTable.id, input.doctor_id))
      .execute();

    return updatedEntries[0];
  } catch (error) {
    console.error('Call next patient failed:', error);
    throw error;
  }
};

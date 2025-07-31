
import { type DoctorLoginInput, type Doctor } from '../schema';

export const doctorLogin = async (input: DoctorLoginInput): Promise<Doctor> => {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is to log in a doctor and assign them to a room.
    // It should:
    // 1. Verify the doctor exists
    // 2. Set their room number
    // 3. Update their status to 'AVAILABLE'
    // 4. Return the updated doctor information
    return Promise.resolve({
        id: input.doctor_id,
        name: 'Placeholder Doctor', // Placeholder name
        specialty: 'GENERAL_MEDICINE', // Placeholder specialty
        room_number: input.room_number,
        status: 'AVAILABLE',
        created_at: new Date()
    } as Doctor);
}

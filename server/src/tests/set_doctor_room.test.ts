
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { type SetDoctorRoomInput } from '../schema';
import { setDoctorRoom } from '../handlers/set_doctor_room';
import { eq } from 'drizzle-orm';

describe('setDoctorRoom', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testDoctorId: number;

  beforeEach(async () => {
    // Create a test doctor
    const doctor = await db.insert(doctorsTable)
      .values({
        name: 'Dr. Test',
        specialty: 'CARDIOLOGY',
        room_number: null,
        status: 'OFFLINE'
      })
      .returning()
      .execute();
    
    testDoctorId = doctor[0].id;
  });

  it('should set doctor room number', async () => {
    const input: SetDoctorRoomInput = {
      doctor_id: testDoctorId,
      room_number: 'Room 101'
    };

    const result = await setDoctorRoom(input);

    expect(result.id).toEqual(testDoctorId);
    expect(result.room_number).toEqual('Room 101');
    expect(result.name).toEqual('Dr. Test');
    expect(result.specialty).toEqual('CARDIOLOGY');
    expect(result.status).toEqual('OFFLINE');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update room number in database', async () => {
    const input: SetDoctorRoomInput = {
      doctor_id: testDoctorId,
      room_number: 'Room 205'
    };

    await setDoctorRoom(input);

    const doctors = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, testDoctorId))
      .execute();

    expect(doctors).toHaveLength(1);
    expect(doctors[0].room_number).toEqual('Room 205');
  });

  it('should update existing room number', async () => {
    // First set a room number
    await db.update(doctorsTable)
      .set({ room_number: 'Room 100' })
      .where(eq(doctorsTable.id, testDoctorId))
      .execute();

    const input: SetDoctorRoomInput = {
      doctor_id: testDoctorId,
      room_number: 'Room 300'
    };

    const result = await setDoctorRoom(input);

    expect(result.room_number).toEqual('Room 300');
    
    // Verify in database
    const doctors = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, testDoctorId))
      .execute();

    expect(doctors[0].room_number).toEqual('Room 300');
  });

  it('should throw error for non-existent doctor', async () => {
    const input: SetDoctorRoomInput = {
      doctor_id: 99999,
      room_number: 'Room 404'
    };

    expect(setDoctorRoom(input)).rejects.toThrow(/doctor with id 99999 not found/i);
  });
});

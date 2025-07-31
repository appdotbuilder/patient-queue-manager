
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { type DoctorLoginInput } from '../schema';
import { doctorLogin } from '../handlers/doctor_login';
import { eq } from 'drizzle-orm';

const testDoctor = {
  name: 'Dr. Smith',
  specialty: 'CARDIOLOGY' as const,
  status: 'OFFLINE' as const
};

const testLoginInput: DoctorLoginInput = {
  doctor_id: 1,
  room_number: 'ROOM-101'
};

describe('doctorLogin', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should login doctor and set room', async () => {
    // Create test doctor first
    const createdDoctor = await db.insert(doctorsTable)
      .values(testDoctor)
      .returning()
      .execute();

    const loginInput = {
      ...testLoginInput,
      doctor_id: createdDoctor[0].id
    };

    const result = await doctorLogin(loginInput);

    // Verify doctor login response
    expect(result.id).toEqual(createdDoctor[0].id);
    expect(result.name).toEqual('Dr. Smith');
    expect(result.specialty).toEqual('CARDIOLOGY');
    expect(result.room_number).toEqual('ROOM-101');
    expect(result.status).toEqual('AVAILABLE');
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should update doctor status and room in database', async () => {
    // Create test doctor
    const createdDoctor = await db.insert(doctorsTable)
      .values(testDoctor)
      .returning()
      .execute();

    const loginInput = {
      ...testLoginInput,
      doctor_id: createdDoctor[0].id
    };

    await doctorLogin(loginInput);

    // Verify database was updated
    const updatedDoctor = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, createdDoctor[0].id))
      .execute();

    expect(updatedDoctor).toHaveLength(1);
    expect(updatedDoctor[0].room_number).toEqual('ROOM-101');
    expect(updatedDoctor[0].status).toEqual('AVAILABLE');
    expect(updatedDoctor[0].name).toEqual('Dr. Smith');
    expect(updatedDoctor[0].specialty).toEqual('CARDIOLOGY');
  });

  it('should throw error for non-existent doctor', async () => {
    const invalidLoginInput = {
      ...testLoginInput,
      doctor_id: 999 // Non-existent doctor ID
    };

    await expect(doctorLogin(invalidLoginInput))
      .rejects.toThrow(/Doctor with ID 999 not found/i);
  });

  it('should update previously logged in doctor', async () => {
    // Create doctor already logged in
    const loggedInDoctor = await db.insert(doctorsTable)
      .values({
        ...testDoctor,
        room_number: 'ROOM-200',
        status: 'AVAILABLE' as const
      })
      .returning()
      .execute();

    const loginInput = {
      doctor_id: loggedInDoctor[0].id,
      room_number: 'ROOM-301'
    };

    const result = await doctorLogin(loginInput);

    // Verify room was updated
    expect(result.room_number).toEqual('ROOM-301');
    expect(result.status).toEqual('AVAILABLE');

    // Verify database reflects change
    const updatedDoctor = await db.select()
      .from(doctorsTable)
      .where(eq(doctorsTable.id, loggedInDoctor[0].id))
      .execute();

    expect(updatedDoctor[0].room_number).toEqual('ROOM-301');
    expect(updatedDoctor[0].status).toEqual('AVAILABLE');
  });
});

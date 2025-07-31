
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { doctorsTable } from '../db/schema';
import { getDoctors } from '../handlers/get_doctors';

describe('getDoctors', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no doctors exist', async () => {
    const result = await getDoctors();
    expect(result).toEqual([]);
  });

  it('should return all doctors', async () => {
    // Create test doctors
    await db.insert(doctorsTable)
      .values([
        {
          name: 'Dr. Smith',
          specialty: 'CARDIOLOGY',
          room_number: 'Room 101',
          status: 'AVAILABLE'
        },
        {
          name: 'Dr. Johnson',
          specialty: 'PEDIATRICS',
          room_number: null,
          status: 'OFFLINE'
        },
        {
          name: 'Dr. Williams',
          specialty: 'DERMATOLOGY',
          room_number: 'Room 203',
          status: 'BUSY'
        }
      ])
      .execute();

    const result = await getDoctors();

    expect(result).toHaveLength(3);
    
    // Check first doctor
    const drSmith = result.find(d => d.name === 'Dr. Smith');
    expect(drSmith).toBeDefined();
    expect(drSmith!.specialty).toEqual('CARDIOLOGY');
    expect(drSmith!.room_number).toEqual('Room 101');
    expect(drSmith!.status).toEqual('AVAILABLE');
    expect(drSmith!.id).toBeDefined();
    expect(drSmith!.created_at).toBeInstanceOf(Date);

    // Check second doctor (with null room_number)
    const drJohnson = result.find(d => d.name === 'Dr. Johnson');
    expect(drJohnson).toBeDefined();
    expect(drJohnson!.specialty).toEqual('PEDIATRICS');
    expect(drJohnson!.room_number).toBeNull();
    expect(drJohnson!.status).toEqual('OFFLINE');

    // Check third doctor
    const drWilliams = result.find(d => d.name === 'Dr. Williams');
    expect(drWilliams).toBeDefined();
    expect(drWilliams!.specialty).toEqual('DERMATOLOGY');
    expect(drWilliams!.room_number).toEqual('Room 203');
    expect(drWilliams!.status).toEqual('BUSY');
  });

  it('should return doctors with all required fields', async () => {
    await db.insert(doctorsTable)
      .values({
        name: 'Dr. Test',
        specialty: 'GENERAL_MEDICINE',
        room_number: 'Room 100',
        status: 'AVAILABLE'
      })
      .execute();

    const result = await getDoctors();
    const doctor = result[0];

    expect(doctor.id).toBeDefined();
    expect(typeof doctor.id).toBe('number');
    expect(doctor.name).toBe('Dr. Test');
    expect(doctor.specialty).toBe('GENERAL_MEDICINE');
    expect(doctor.room_number).toBe('Room 100');
    expect(doctor.status).toBe('AVAILABLE');
    expect(doctor.created_at).toBeInstanceOf(Date);
  });

  it('should handle different doctor statuses', async () => {
    await db.insert(doctorsTable)
      .values([
        {
          name: 'Dr. Available',
          specialty: 'CARDIOLOGY',
          status: 'AVAILABLE'
        },
        {
          name: 'Dr. Busy',
          specialty: 'NEUROLOGY',
          status: 'BUSY'
        },
        {
          name: 'Dr. Offline',
          specialty: 'ORTHOPEDICS',
          status: 'OFFLINE'
        }
      ])
      .execute();

    const result = await getDoctors();
    expect(result).toHaveLength(3);

    const statuses = result.map(d => d.status);
    expect(statuses).toContain('AVAILABLE');
    expect(statuses).toContain('BUSY');
    expect(statuses).toContain('OFFLINE');
  });
});

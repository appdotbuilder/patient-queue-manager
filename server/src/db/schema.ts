
import { serial, text, pgTable, timestamp, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums for PostgreSQL
export const medicalSpecialtyEnum = pgEnum('medical_specialty', [
  'GENERAL_MEDICINE',
  'CARDIOLOGY',
  'DERMATOLOGY',
  'PEDIATRICS',
  'ORTHOPEDICS',
  'NEUROLOGY',
  'GYNECOLOGY',
  'PSYCHIATRY',
  'OPHTHALMOLOGY',
  'ENT'
]);

export const queueStatusEnum = pgEnum('queue_status', [
  'WAITING',
  'CALLED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED'
]);

export const doctorStatusEnum = pgEnum('doctor_status', [
  'AVAILABLE',
  'BUSY',
  'OFFLINE'
]);

// Doctors table
export const doctorsTable = pgTable('doctors', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  specialty: medicalSpecialtyEnum('specialty').notNull(),
  room_number: text('room_number'), // Nullable - doctor may not be assigned to a room
  status: doctorStatusEnum('status').notNull().default('OFFLINE'),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Queue entries table
export const queueEntriesTable = pgTable('queue_entries', {
  id: serial('id').primaryKey(),
  patient_id: text('patient_id').notNull(),
  specialty: medicalSpecialtyEnum('specialty').notNull(),
  queue_number: integer('queue_number').notNull(), // Sequential number for the specialty queue
  status: queueStatusEnum('status').notNull().default('WAITING'),
  doctor_id: integer('doctor_id'), // Nullable - assigned when called
  room_number: text('room_number'), // Nullable - set when patient is called
  created_at: timestamp('created_at').defaultNow().notNull(),
  called_at: timestamp('called_at'), // Nullable - set when patient is called
  completed_at: timestamp('completed_at'), // Nullable - set when consultation is completed
});

// Display board entries table - for current announcements
export const displayBoardEntriesTable = pgTable('display_board_entries', {
  id: serial('id').primaryKey(),
  patient_id: text('patient_id').notNull(),
  room_number: text('room_number').notNull(),
  specialty: medicalSpecialtyEnum('specialty').notNull(),
  status: queueStatusEnum('status').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
});

// Relations
export const doctorsRelations = relations(doctorsTable, ({ many }) => ({
  queueEntries: many(queueEntriesTable),
}));

export const queueEntriesRelations = relations(queueEntriesTable, ({ one }) => ({
  doctor: one(doctorsTable, {
    fields: [queueEntriesTable.doctor_id],
    references: [doctorsTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Doctor = typeof doctorsTable.$inferSelect;
export type NewDoctor = typeof doctorsTable.$inferInsert;
export type QueueEntry = typeof queueEntriesTable.$inferSelect;
export type NewQueueEntry = typeof queueEntriesTable.$inferInsert;
export type DisplayBoardEntry = typeof displayBoardEntriesTable.$inferSelect;
export type NewDisplayBoardEntry = typeof displayBoardEntriesTable.$inferInsert;

// Export all tables for proper query building
export const tables = {
  doctors: doctorsTable,
  queueEntries: queueEntriesTable,
  displayBoardEntries: displayBoardEntriesTable
};

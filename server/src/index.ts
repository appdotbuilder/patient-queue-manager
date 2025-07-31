
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import {
  joinQueueInputSchema,
  doctorLoginInputSchema,
  setDoctorRoomInputSchema,
  callNextPatientInputSchema,
  completePatientInputSchema
} from './schema';

// Import handlers
import { joinQueue } from './handlers/join_queue';
import { getQueueStatus } from './handlers/get_queue_status';
import { getPatientQueueInfo } from './handlers/get_patient_queue_info';
import { doctorLogin } from './handlers/doctor_login';
import { setDoctorRoom } from './handlers/set_doctor_room';
import { callNextPatient } from './handlers/call_next_patient';
import { completePatient } from './handlers/complete_patient';
import { getDisplayBoard } from './handlers/get_display_board';
import { getDoctors } from './handlers/get_doctors';
import { cancelQueueEntry } from './handlers/cancel_queue_entry';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Patient operations
  joinQueue: publicProcedure
    .input(joinQueueInputSchema)
    .mutation(({ input }) => joinQueue(input)),

  getQueueStatus: publicProcedure
    .query(() => getQueueStatus()),

  getPatientQueueInfo: publicProcedure
    .input(z.string())
    .query(({ input }) => getPatientQueueInfo(input)),

  cancelQueueEntry: publicProcedure
    .input(z.number())
    .mutation(({ input }) => cancelQueueEntry(input)),

  // Doctor operations
  doctorLogin: publicProcedure
    .input(doctorLoginInputSchema)
    .mutation(({ input }) => doctorLogin(input)),

  setDoctorRoom: publicProcedure
    .input(setDoctorRoomInputSchema)
    .mutation(({ input }) => setDoctorRoom(input)),

  callNextPatient: publicProcedure
    .input(callNextPatientInputSchema)
    .mutation(({ input }) => callNextPatient(input)),

  completePatient: publicProcedure
    .input(completePatientInputSchema)
    .mutation(({ input }) => completePatient(input)),

  getDoctors: publicProcedure
    .query(() => getDoctors()),

  // Display board operations
  getDisplayBoard: publicProcedure
    .query(() => getDisplayBoard()),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Medical Queue Management TRPC server listening at port: ${port}`);
}

start();

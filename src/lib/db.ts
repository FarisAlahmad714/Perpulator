import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Strip channel_binding param — not supported by the neon HTTP driver
const dbUrl = (process.env.DATABASE_URL ?? '').replace(/[&?]channel_binding=[^&]*/g, '');
const sql = neon(dbUrl);
export const db = drizzle(sql, { schema });

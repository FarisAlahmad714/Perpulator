/**
 * One-time migration endpoint. Protected by MIGRATE_SECRET env var.
 * Usage: POST /api/admin/migrate  Authorization: Bearer <MIGRATE_SECRET>
 * Delete this route once the database schema is confirmed up-to-date.
 */
import { neon } from '@neondatabase/serverless';

export async function POST(req: Request) {
  const secret = process.env.MIGRATE_SECRET;
  if (!secret) {
    return Response.json({ error: 'MIGRATE_SECRET not configured' }, { status: 500 });
  }
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawUrl = process.env.DATABASE_URL ?? '';
  if (!rawUrl) {
    return Response.json({ error: 'DATABASE_URL not set' }, { status: 500 });
  }
  const dbUrl = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '');
  const sql = neon(dbUrl);

  const results: string[] = [];

  try {
    await sql`CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text,
      "email" text UNIQUE,
      "emailVerified" timestamp,
      "image" text
    )`;
    results.push('users ✓');

    await sql`CREATE TABLE IF NOT EXISTS "accounts" (
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" text NOT NULL,
      "provider" text NOT NULL,
      "providerAccountId" text NOT NULL,
      "refresh_token" text,
      "access_token" text,
      "expires_at" integer,
      "token_type" text,
      "scope" text,
      "id_token" text,
      "session_state" text,
      PRIMARY KEY ("provider", "providerAccountId")
    )`;
    results.push('accounts ✓');

    await sql`CREATE TABLE IF NOT EXISTS "sessions" (
      "sessionToken" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" timestamp NOT NULL
    )`;
    results.push('sessions ✓');

    await sql`CREATE TABLE IF NOT EXISTS "verificationTokens" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp NOT NULL,
      PRIMARY KEY ("identifier", "token")
    )`;
    results.push('verificationTokens ✓');

    await sql`CREATE TABLE IF NOT EXISTS "positions" (
      "id" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "data" jsonb NOT NULL,
      "savedAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )`;
    results.push('positions ✓');

    await sql`CREATE TABLE IF NOT EXISTS "api_keys" (
      "id" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "key" text NOT NULL UNIQUE,
      "name" text NOT NULL DEFAULT 'Default',
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "lastUsedAt" timestamp,
      "totalRequests" integer NOT NULL DEFAULT 0
    )`;
    results.push('api_keys ✓');

    await sql`ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "totalRequests" integer NOT NULL DEFAULT 0`;
    results.push('api_keys.totalRequests ✓');

    await sql`CREATE TABLE IF NOT EXISTS "api_request_logs" (
      "id" text PRIMARY KEY NOT NULL,
      "keyId" text NOT NULL REFERENCES "api_keys"("id") ON DELETE CASCADE,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "endpoint" text NOT NULL,
      "status" integer NOT NULL,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )`;
    results.push('api_request_logs ✓');

    await sql`CREATE INDEX IF NOT EXISTS idx_logs_key_created ON "api_request_logs"("keyId", "createdAt")`;
    results.push('index ✓');

    return Response.json({ ok: true, tables: results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, completed: results, error: msg }, { status: 500 });
  }
}

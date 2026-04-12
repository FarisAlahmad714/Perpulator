/**
 * Lightweight migration script using the Neon HTTP driver.
 * Runs CREATE TABLE IF NOT EXISTS for every table in our schema.
 * Safe to run on every deployment — idempotent.
 */
import { neon } from '@neondatabase/serverless';

const rawUrl = process.env.DATABASE_URL ?? '';
if (!rawUrl) {
  console.error('ERROR: DATABASE_URL is not set');
  process.exit(1);
}

// Strip channel_binding — not supported by the Neon HTTP driver
const dbUrl = rawUrl.replace(/[&?]channel_binding=[^&]*/g, '');
const sql = neon(dbUrl);

async function migrate() {
  console.log('[migrate] Starting schema migration via Neon HTTP driver...');

  await sql`
    CREATE TABLE IF NOT EXISTS "users" (
      "id" text PRIMARY KEY NOT NULL,
      "name" text,
      "email" text UNIQUE,
      "emailVerified" timestamp,
      "image" text
    )
  `;
  console.log('[migrate] users ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS "accounts" (
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
    )
  `;
  console.log('[migrate] accounts ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS "sessions" (
      "sessionToken" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "expires" timestamp NOT NULL
    )
  `;
  console.log('[migrate] sessions ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS "verificationTokens" (
      "identifier" text NOT NULL,
      "token" text NOT NULL,
      "expires" timestamp NOT NULL,
      PRIMARY KEY ("identifier", "token")
    )
  `;
  console.log('[migrate] verificationTokens ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS "positions" (
      "id" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "data" jsonb NOT NULL,
      "savedAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `;
  console.log('[migrate] positions ✓');

  await sql`
    CREATE TABLE IF NOT EXISTS "api_keys" (
      "id" text PRIMARY KEY NOT NULL,
      "userId" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "key" text NOT NULL UNIQUE,
      "name" text NOT NULL DEFAULT 'Default',
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "lastUsedAt" timestamp
    )
  `;
  console.log('[migrate] api_keys ✓');

  console.log('[migrate] All tables ready.');
}

migrate().catch(err => {
  console.error('[migrate] FAILED:', err.message ?? err);
  process.exit(1);
});

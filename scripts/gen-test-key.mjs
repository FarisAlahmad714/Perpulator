/**
 * Generates a test API key directly in the database.
 * Usage: node scripts/gen-test-key.mjs
 */
import { readFileSync } from 'fs';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { neon } from '@neondatabase/serverless';

// Load .env.local manually
const envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8');
const env = Object.fromEntries(
  envContent.split('\n')
    .filter(l => l.includes('='))
    .map(l => {
      const idx = l.indexOf('=');
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()];
    })
);

// Strip channel_binding param — not supported by neon HTTP driver
const dbUrl = env.DATABASE_URL.replace(/[&?]channel_binding=[^&]*/g, '');
const sql = neon(dbUrl);

async function main() {
  // List existing users
  const users = await sql`SELECT id, name, email FROM users LIMIT 10`;
  console.log('\n=== Users in DB ===');
  if (users.length === 0) {
    console.log('No users found. Creating a test user...');
    const testUserId = randomUUID();
    await sql`
      INSERT INTO users (id, name, email)
      VALUES (${testUserId}, ${'Test User'}, ${'test@perpulator.dev'})
    `;
    users.push({ id: testUserId, name: 'Test User', email: 'test@perpulator.dev' });
  }
  users.forEach(u => console.log(`  ${u.id} | ${u.name} | ${u.email}`));

  const userId = users[0].id;
  console.log(`\nUsing userId: ${userId}`);

  // Check existing keys
  const existingKeys = await sql`SELECT id, name, "createdAt", "lastUsedAt" FROM api_keys WHERE "userId" = ${userId}`;
  console.log(`\n=== Existing API keys (${existingKeys.length}) ===`);
  existingKeys.forEach(k => console.log(`  ${k.id} | ${k.name}`));

  // Generate a fresh test key
  const rawKeyBytes = randomBytes(32);
  const rawKey = 'perp_' + rawKeyBytes.toString('hex');
  const hash = createHash('sha256').update(rawKey, 'utf8').digest('hex');
  const keyId = randomUUID();

  await sql`
    INSERT INTO api_keys (id, "userId", key, name, "createdAt")
    VALUES (${keyId}, ${userId}, ${hash}, ${'E2E-Test-Key'}, NOW())
    ON CONFLICT (key) DO NOTHING
  `;

  console.log('\n=== New Test API Key ===');
  console.log(`  Raw key:  ${rawKey}`);
  console.log(`  Hash:     ${hash}`);
  console.log(`  Key ID:   ${keyId}`);
  console.log(`  User ID:  ${userId}`);
  console.log('\nCopy the raw key above to use in API tests.');
}

main().catch(err => { console.error(err); process.exit(1); });

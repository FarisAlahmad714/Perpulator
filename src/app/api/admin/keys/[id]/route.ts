import { auth } from '@/auth';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { eq } from 'drizzle-orm';

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? 'farisalahmad714@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase());

function isAdmin(email: string | null | undefined) {
  return !!email && ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const deleted = await db
    .delete(apiKeys)
    .where(eq(apiKeys.id, params.id))
    .returning({ id: apiKeys.id });

  if (!deleted.length) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ deleted: deleted[0].id });
}

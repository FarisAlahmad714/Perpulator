import { auth } from '@/auth';
import { db } from '@/lib/db';
import { apiKeys } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Scope delete to the authenticated user — prevents deleting other users' keys
  const deleted = await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.id, params.id), eq(apiKeys.userId, session.user.id)))
    .returning({ id: apiKeys.id });

  if (!deleted.length) {
    return Response.json({ error: 'Not found' }, { status: 404 });
  }

  return Response.json({ success: true });
}

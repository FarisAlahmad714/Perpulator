import { auth } from '@/auth';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { and, eq } from 'drizzle-orm';

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Ensure users can only delete their own positions
  await db
    .delete(positions)
    .where(
      and(
        eq(positions.id, params.id),
        eq(positions.userId, session.user.id)
      )
    );

  return Response.json({ success: true });
}

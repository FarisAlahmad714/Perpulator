import { auth } from '@/auth';
import { db } from '@/lib/db';
import { positions } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { Position } from '@/types/position';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rows = await db
    .select()
    .from(positions)
    .where(eq(positions.userId, session.user.id));

  // Deserialise dates that were stored as strings in JSONB
  const result = rows.map((row) => {
    const data = row.data as Position;
    return {
      ...data,
      timestamp: new Date(data.timestamp),
      savedAt: new Date(data.savedAt),
    };
  });

  return Response.json(result);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const position: Position = await req.json();

  await db
    .insert(positions)
    .values({
      id: position.id,
      userId: session.user.id,
      data: position,
      savedAt: new Date(),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: positions.id,
      set: { data: position, updatedAt: new Date() },
    });

  return Response.json({ success: true });
}

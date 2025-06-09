import { getUser } from '@/lib/db/auth-queries';

export async function GET() {
  const user = await getUser();
  return Response.json(user);
}

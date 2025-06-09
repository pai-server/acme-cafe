import { getTeamForUser } from '@/lib/db/auth-queries';

export async function GET() {
  const team = await getTeamForUser();
  return Response.json(team);
}

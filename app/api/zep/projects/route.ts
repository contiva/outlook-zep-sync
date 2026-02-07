import { NextResponse } from 'next/server';
import { readProjekte, mapProjektToRestFormat } from '@/lib/zep-soap';
import { getAuthenticatedUser } from '@/lib/auth-helper';

export async function GET(request: Request) {
  // Check authentication (supports both NextAuth and Teams SSO)
  const user = await getAuthenticatedUser(request);
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = process.env.ZEP_SOAP_TOKEN;

  if (!token) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  try {
    const projekte = await readProjekte(token, {});
    const projects = projekte.map(mapProjektToRestFormat);
    return NextResponse.json(projects);
  } catch (error) {
    console.error('ZEP projects fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch ZEP projects' }, { status: 500 });
  }
}

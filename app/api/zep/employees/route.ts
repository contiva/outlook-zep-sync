import { NextResponse } from 'next/server';
import { findEmployeeByEmail, mapMitarbeiterToRestFormat } from '@/lib/zep-soap';
import { getAuthenticatedUser } from '@/lib/auth-helper';

// GET /api/zep/employees?email=robert.fels@contiva.com
// Returns matching ZEP employee or 404
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

  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'email parameter required' }, { status: 400 });
  }

  // Security: Users can only query their own employee data
  if (email.toLowerCase() !== user.email.toLowerCase()) {
    console.warn(`Security: User ${user.email} tried to access employee data for ${email}`);
    return NextResponse.json(
      { error: 'Zugriff verweigert: Sie können nur Ihre eigenen Daten abrufen' },
      { status: 403 },
    );
  }

  try {
    const employee = await findEmployeeByEmail(token, email);

    if (!employee) {
      return NextResponse.json(
        { error: 'No matching employee found for this email' },
        { status: 404 },
      );
    }

    return NextResponse.json(mapMitarbeiterToRestFormat(employee));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees from ZEP' }, { status: 500 });
  }
}

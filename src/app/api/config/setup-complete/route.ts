import configManager from '@/lib/config';
import { NextRequest } from 'next/server';
import { requireVaneAdmin } from '@/lib/mdConnectAdmin';

export const POST = async (req: NextRequest) => {
  const denied = await requireVaneAdmin();
  if (denied) return denied;
  try {
    configManager.markSetupComplete();

    return Response.json(
      {
        message: 'Setup marked as complete.',
      },
      {
        status: 200,
      },
    );
  } catch (err) {
    console.error('Error marking setup as complete: ', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};

import { z } from 'zod';
import { requireVaneAdmin } from '@/lib/mdConnectAdmin';
import { setDefaultQuota } from '@/lib/usage/store';

const bodySchema = z.object({
  monthlyTokenLimit: z.number().int().min(0).max(1_000_000_000),
  enforce: z.boolean(),
});

export const PATCH = async (req: Request) => {
  const denied = await requireVaneAdmin();
  if (denied) return denied;

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return Response.json({ message: 'Invalid quota.' }, { status: 400 });
  }

  const quota = await setDefaultQuota(parsed.data);
  return Response.json(quota);
};

import { getVaneActor } from '@/lib/vaneActor';
import { getUsageBalance } from '@/lib/mdConnectUsage';

export const GET = async () => {
  const actor = await getVaneActor();
  if (!actor) {
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const balance = await getUsageBalance(actor.sub);
    const monthlyTokenLimit =
      balance.monthly_tokens == null
        ? null
        : balance.monthly_tokens + balance.bonus;
    const remainingTokens =
      monthlyTokenLimit == null
        ? null
        : Math.max(0, monthlyTokenLimit - balance.committed);

    return Response.json(
      {
        period: balance.period,
        usedTokens: balance.committed,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCents: 0,
        monthlyTokenLimit,
        remainingTokens,
        bonus: balance.bonus,
        held: balance.held,
        enforce: true,
        blocked: monthlyTokenLimit != null && remainingTokens === 0,
        byModel: [],
        helpUrl: balance.help_url,
        managedByConnect: true,
        canConfigure: actor.canConfigure,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    console.error('Failed to load MD Connect usage:', error);
    return Response.json({ message: 'USAGE_UNAVAILABLE' }, { status: 503 });
  }
};

import { getVaneActor } from '@/lib/vaneActor';
import { getUsageBalance } from '@/lib/mdConnectUsage';

export const GET = async () => {
  const actor = await getVaneActor();
  if (!actor) {
    return Response.json({ message: 'Unauthorized.' }, { status: 401 });
  }

  try {
    const balance = await getUsageBalance(actor.sub);
    const employeeLimit =
      balance.monthly_tokens == null
        ? null
        : balance.monthly_tokens + balance.bonus;
    const vaneApp = balance.by_app.find((row) => row.client_id === 'vane.search');
    const appLimit = vaneApp?.monthly_tokens ?? null;
    const appUsed = vaneApp?.committed ?? balance.committed;
    const employeeRemaining =
      employeeLimit == null ? null : Math.max(0, employeeLimit - balance.committed);
    const appRemaining = appLimit == null ? null : Math.max(0, appLimit - appUsed);
    const remainingTokens = [employeeRemaining, appRemaining].reduce<number | null>(
      (lowest, value) =>
        value == null ? lowest : lowest == null ? value : Math.min(lowest, value),
      null,
    );
    const monthlyTokenLimit =
      appLimit == null
        ? employeeLimit
        : employeeLimit == null
          ? appLimit
          : Math.min(employeeLimit, appLimit);
    const usedTokens = vaneApp ? appUsed : balance.committed;

    return Response.json(
      {
        period: balance.period,
        usedTokens,
        promptTokens: 0,
        completionTokens: 0,
        estimatedCents: 0,
        monthlyTokenLimit,
        remainingTokens,
        bonus: balance.bonus,
        held: vaneApp?.held ?? balance.held,
        appLimit,
        enforce: true,
        blocked:
          (employeeRemaining === 0 && employeeLimit != null) ||
          (appRemaining === 0 && appLimit != null),
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

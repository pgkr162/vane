import generateSuggestions from '@/lib/agents/suggestions';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { getVaneActor } from '@/lib/vaneActor';
import { runWithUsageContext } from '@/lib/usage/context';
import { QuotaExceededError, assertQuota } from '@/lib/usage/store';

interface SuggestionsGenerationBody {
  chatHistory: any[];
  chatModel: ModelWithProvider;
}

export const POST = async (req: Request) => {
  try {
    const actor = await getVaneActor();
    if (!actor) {
      return Response.json({ message: 'Unauthorized.' }, { status: 401 });
    }
    try {
      await assertQuota(actor.sub);
    } catch (err) {
      if (err instanceof QuotaExceededError) {
        return Response.json(
          { message: 'TOKEN_QUOTA_EXCEEDED' },
          { status: 429 },
        );
      }
      throw err;
    }

    const body: SuggestionsGenerationBody = await req.json();

    const registry = new ModelRegistry();

    const llm = await registry.resolveUtilityLlm(body.chatModel);

    const suggestions = await runWithUsageContext(actor.sub, () =>
      generateSuggestions(
        {
          chatHistory: body.chatHistory.map(([role, content]) => ({
            role: role === 'human' ? 'user' : 'assistant',
            content,
          })),
        },
        llm,
      ),
    );

    return Response.json({ suggestions }, { status: 200 });
  } catch (err) {
    console.error(`An error occurred while generating suggestions: ${err}`);
    return Response.json(
      { message: 'An error occurred while generating suggestions' },
      { status: 500 },
    );
  }
};

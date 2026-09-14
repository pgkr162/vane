import generateSuggestions from '@/lib/agents/suggestions';
import ModelRegistry from '@/lib/models/registry';
import { ModelWithProvider } from '@/lib/models/types';
import { getVaneActor } from '@/lib/vaneActor';
import { runWithUsageContext } from '@/lib/usage/context';
import {
  TokenQuotaExceededError,
  UTILITY_TOKEN_ESTIMATE,
  reserveUsage,
  settleUsage,
  tokenQuotaResponse,
} from '@/lib/mdConnectUsage';

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

    const body: SuggestionsGenerationBody = await req.json();

    const registry = new ModelRegistry();

    const llm = await registry.resolveUtilityLlm(body.chatModel);
    const nonce = crypto.randomUUID();
    const sink = { promptTokens: 0, completionTokens: 0 };
    await reserveUsage({
      sub: actor.sub,
      nonce,
      estimatedTokens: UTILITY_TOKEN_ESTIMATE,
      model: body.chatModel?.key,
    });

    try {
      const suggestions = await runWithUsageContext(
        { userId: actor.sub, nonce, sink },
        () =>
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
      await settleUsage({
        sub: actor.sub,
        nonce,
        outcome: 'success',
        promptTokens: sink.promptTokens,
        completionTokens: sink.completionTokens,
      });
      return Response.json({ suggestions }, { status: 200 });
    } catch (err) {
      await settleUsage({
        sub: actor.sub,
        nonce,
        outcome: 'provider_unavailable',
        promptTokens: sink.promptTokens,
        completionTokens: sink.completionTokens,
      });
      throw err;
    }
  } catch (err) {
    if (err instanceof TokenQuotaExceededError) {
      return tokenQuotaResponse(err);
    }
    console.error(`An error occurred while generating suggestions: ${err}`);
    return Response.json(
      { message: 'An error occurred while generating suggestions' },
      { status: 500 },
    );
  }
};

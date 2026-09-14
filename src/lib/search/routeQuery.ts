import {
  FLASH_MODEL,
  LUNA_MODEL,
  MINIMAX_MODEL,
  SearchMode,
} from './presets';

export type RoutedSearch = {
  preset: 'fast' | 'balanced' | 'deep' | 'long';
  mode: SearchMode;
  modelKey: string;
};

const DEEP_RESEARCH =
  /compare|versus|\bvs\.?\b|difference|market research|competitor|tariff|\bhts\b|hs code|regulation|analy[sz]e|deep dive|research plan|multi-step|比較|分析|關稅|稅則|競品|市場調查|法規|深度|優缺點/i;

const FAST_FACTUAL =
  /^(what is|who is|when is|where is|how much|how many|what's|whats|是什麼|什麼是|誰是|多少錢|幾點)\b/i;

const BUSINESS =
  /email|draft|summar|translat|write|產品|郵件|摘要|翻譯|請幫|撰寫|回信/i;

const LONG_CONTEXT =
  /\bpdf\b|this document|this pdf|這份文件|這篇文章|附件|screenshot|影片分析|圖片分析|long[- ]form|全文|長文/i;

export function routeSearchQuery(
  query: string,
  options?: { fileCount?: number },
): RoutedSearch {
  const text = query.trim();
  const fileCount = options?.fileCount ?? 0;

  if (fileCount > 0 || text.length > 3500 || LONG_CONTEXT.test(text)) {
    return { preset: 'long', mode: 'quality', modelKey: MINIMAX_MODEL };
  }

  if (DEEP_RESEARCH.test(text)) {
    return { preset: 'deep', mode: 'quality', modelKey: FLASH_MODEL };
  }

  const compact = text.replace(/\s+/g, ' ');
  const shortEnough = compact.length <= 80 && compact.split(' ').length <= 10;
  if (shortEnough && FAST_FACTUAL.test(compact) && !BUSINESS.test(text)) {
    return { preset: 'fast', mode: 'speed', modelKey: FLASH_MODEL };
  }

  return { preset: 'balanced', mode: 'balanced', modelKey: LUNA_MODEL };
}

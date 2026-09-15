const CHAT = ['librechat', 'LibreChat', 'Chat', '對話（Chat）'];
const SEARCH = ['vane.search', 'vane', 'Vane Search', 'Search (Vane)', '搜尋（Vane）'];

export function aiAppLabel(
  app: { client_id?: string; name?: string },
  t: (key: 'quotaAppChat' | 'quotaAppSearch') => string,
) {
  const id = app.client_id ?? '';
  const name = app.name ?? '';
  if (SEARCH.includes(id) || SEARCH.includes(name)) return t('quotaAppSearch');
  if (CHAT.includes(id) || CHAT.includes(name)) return t('quotaAppChat');
  return name;
}

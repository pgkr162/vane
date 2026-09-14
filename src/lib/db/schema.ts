import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { Block } from '../types';
import { SearchSources } from '../agents/search/types';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  messageId: text('messageId').notNull(),
  chatId: text('chatId').notNull(),
  backendId: text('backendId').notNull(),
  query: text('query').notNull(),
  createdAt: text('createdAt').notNull(),
  responseBlocks: text('responseBlocks', { mode: 'json' })
    .$type<Block[]>()
    .default(sql`'[]'`),
  status: text({ enum: ['answering', 'completed', 'error'] }).default(
    'answering',
  ),
});

interface DBFile {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  sources: text('sources', {
    mode: 'json',
  })
    .$type<SearchSources[]>()
    .default(sql`'[]'`),
  files: text('files', { mode: 'json' })
    .$type<DBFile[]>()
    .default(sql`'[]'`),
});

export const usageEvents = sqliteTable('usage_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: text('userId').notNull(),
  model: text('model').notNull(),
  promptTokens: integer('promptTokens').notNull().default(0),
  completionTokens: integer('completionTokens').notNull().default(0),
  totalTokens: integer('totalTokens').notNull().default(0),
  estimatedCents: integer('estimatedCents').notNull().default(0),
  createdAt: text('createdAt').notNull(),
});

export const usageQuotas = sqliteTable('usage_quotas', {
  userId: text('userId').primaryKey(),
  monthlyTokenLimit: integer('monthlyTokenLimit').notNull().default(2000000),
  enforce: integer('enforce').notNull().default(1),
  updatedAt: text('updatedAt').notNull(),
});

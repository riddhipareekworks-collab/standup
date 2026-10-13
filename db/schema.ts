import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
export const agentSettings = sqliteTable('agent_settings', {
 id: text('id').primaryKey(),
 persona: text('persona').notNull(),
 tone: text('tone').notNull(),
 empathy: integer('empathy').notNull(),
 goalOrientation: integer('goal_orientation').notNull(),
 conversationGoal: text('conversation_goal').notNull().default(''),
 empathyExamples: text('empathy_examples').notNull().default('[]'),
 updatedAt: text('updated_at').notNull(),
});

export const chatSessions = sqliteTable('chat_sessions', {
 id:text('id').primaryKey(), tokenHash:text('token_hash').notNull(), source:text('source').notNull(),
 createdAt:text('created_at').notNull(), updatedAt:text('updated_at').notNull(), lockUntil:integer('lock_until').notNull().default(0),
});
export const chatTurns = sqliteTable('chat_turns', {
 id:integer('id').primaryKey({autoIncrement:true}), sessionId:text('session_id').notNull().references(()=>chatSessions.id),
 requestId:text('request_id').notNull(), userText:text('user_text').notNull(), assistantText:text('assistant_text'),
 requestedAt:text('requested_at').notNull(), respondedAt:text('responded_at'), status:text('status').notNull(), error:text('error'),
}, (table)=>[uniqueIndex('chat_turn_request').on(table.sessionId,table.requestId),index('chat_turn_session').on(table.sessionId,table.id)]);

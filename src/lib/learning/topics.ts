import { createAdminClient, supabase } from '@/lib/supabase';
import type { TopicHistory } from './types';

/**
 * Fetch topics used in the last N days from learning_topic_history.
 * Uses the public supabase client (read-only).
 */
export async function getTopicHistory(days: number = 60): Promise<TopicHistory[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('learning_topic_history')
    .select('*')
    .gte('used_date', cutoffStr)
    .order('used_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch topic history:', error.message);
    return [];
  }

  return (data as TopicHistory[]) ?? [];
}

/**
 * Record a topic usage in learning_topic_history.
 * Uses the admin client (service role) for writes.
 */
export async function recordTopicUsage(
  categorySlug: string,
  topicTitle: string,
  keywords: string[],
  usedDate: string
): Promise<void> {
  const admin = createAdminClient();

  const { error } = await admin
    .from('learning_topic_history')
    .insert({
      category_slug: categorySlug,
      topic_title: topicTitle,
      topic_keywords: keywords,
      used_date: usedDate,
    });

  if (error) {
    console.error('Failed to record topic usage:', error.message);
    throw new Error(`Failed to record topic usage: ${error.message}`);
  }
}

/**
 * Check if a topic (or something very similar) was used within the last N days.
 * Uses the public supabase client.
 */
export async function isTopicRecent(topicTitle: string, days: number = 60): Promise<boolean> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('learning_topic_history')
    .select('id')
    .gte('used_date', cutoffStr)
    .ilike('topic_title', topicTitle)
    .limit(1);

  if (error) {
    console.error('Failed to check topic recency:', error.message);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

import Anthropic from '@anthropic-ai/sdk';
import { createAdminClient, supabase } from '@/lib/supabase';
import * as prompts from './prompts';
import { getTopicHistory, recordTopicUsage } from './topics';
import type {
  WeeklyPlan,
  LessonGenerationRequest,
  SafetyReviewResult,
  LearningCategory,
} from './types';

const MODEL = 'claude-haiku-4-5-20251001';

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

/* ============================================
   SLUG GENERATION
   ============================================ */

function generateSlug(title: string, date?: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
  const dateSuffix = date || new Date().toISOString().split('T')[0];
  return `${base}-${dateSuffix}`;
}

/* ============================================
   READING TIME CALCULATION
   ============================================ */

function calculateReadingTime(content: string): number {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(wordCount / 200));
}

/* ============================================
   API CALL LOGGING
   ============================================ */

async function logApiCall(params: {
  lessonId?: string;
  promptSent: string;
  responseReceived: string | null;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  status: 'success' | 'error';
  errorMessage?: string;
}): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin.from('learning_generation_log').insert({
      lesson_id: params.lessonId || null,
      prompt_sent: params.promptSent,
      response_received: params.responseReceived,
      model: params.model,
      input_tokens: params.inputTokens || null,
      output_tokens: params.outputTokens || null,
      status: params.status,
      error_message: params.errorMessage || null,
    });
  } catch (err) {
    console.error('Failed to log API call:', err);
  }
}

/* ============================================
   PROMPT SELECTION
   ============================================ */

const PROMPT_MAP: Record<string, Record<string, string>> = {
  'ai-dev-career': {
    article: prompts.AI_CAREER_ARTICLE_PROMPT,
    interactive: prompts.AI_CAREER_INTERACTIVE_PROMPT,
    quickbite: prompts.AI_CAREER_QUICKBITE_PROMPT,
  },
  'random-facts': {
    article: prompts.RANDOM_FACTS_ARTICLE_PROMPT,
    interactive: prompts.RANDOM_FACTS_INTERACTIVE_PROMPT,
    quickbite: prompts.RANDOM_FACTS_QUICKBITE_PROMPT,
  },
  'life-skills': {
    article: prompts.LIFE_SKILLS_ARTICLE_PROMPT,
    interactive: prompts.LIFE_SKILLS_INTERACTIVE_PROMPT,
    quickbite: prompts.LIFE_SKILLS_QUICKBITE_PROMPT,
  },
};

function selectPrompt(categorySlug: string, format: string): string {
  const categoryPrompts = PROMPT_MAP[categorySlug];
  if (!categoryPrompts) {
    throw new Error(`Unknown category slug: ${categorySlug}`);
  }
  const prompt = categoryPrompts[format];
  if (!prompt) {
    throw new Error(`Unknown format "${format}" for category "${categorySlug}"`);
  }
  return prompt;
}

/* ============================================
   FETCH CATEGORIES
   ============================================ */

async function fetchCategories(): Promise<LearningCategory[]> {
  const { data, error } = await supabase
    .from('learning_categories')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }

  return (data as LearningCategory[]) ?? [];
}

/* ============================================
   GENERATE WEEKLY CONTENT (Main Entry Point)
   ============================================ */

export async function generateWeeklyContent(startDate: Date): Promise<{
  generated: number;
  approved: number;
  rejected: number;
  errors: string[];
}> {
  const stats = { generated: 0, approved: 0, rejected: 0, errors: [] as string[] };

  // 1. Fetch topic history to avoid repeats
  const history = await getTopicHistory(60);
  const historyJson = JSON.stringify(
    history.map((h) => ({
      category: h.category_slug,
      title: h.topic_title,
      keywords: h.topic_keywords,
      date: h.used_date,
    })),
    null,
    2
  );

  // 2. Build the orchestrator prompt
  const startDateStr = startDate.toISOString().split('T')[0];
  const filledPrompt = prompts.fillTemplate(prompts.ORCHESTRATOR_PLAN_PROMPT, {
    startDate: startDateStr,
    history: historyJson,
  });

  // 3. Call Claude for the weekly plan
  const client = getClient();
  let planResponse: Anthropic.Message;
  try {
    planResponse = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: filledPrompt }],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logApiCall({
      promptSent: filledPrompt,
      responseReceived: null,
      model: MODEL,
      status: 'error',
      errorMessage: errorMsg,
    });
    stats.errors.push(`Planning API call failed: ${errorMsg}`);
    return stats;
  }

  const planText =
    planResponse.content[0].type === 'text' ? planResponse.content[0].text : '';

  // Log the planning call
  await logApiCall({
    promptSent: filledPrompt,
    responseReceived: planText,
    model: MODEL,
    inputTokens: planResponse.usage?.input_tokens,
    outputTokens: planResponse.usage?.output_tokens,
    status: 'success',
  });

  // 4. Parse the plan (strip markdown code fences if present)
  let weeklyPlans: WeeklyPlan[];
  try {
    const cleanedJson = planText
      .replace(/^```(?:json)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .trim();
    weeklyPlans = JSON.parse(cleanedJson) as WeeklyPlan[];
  } catch {
    stats.errors.push('Failed to parse weekly plan JSON from Claude response');
    return stats;
  }

  // 5. Fetch category IDs
  const categories = await fetchCategories();
  const categoryMap = new Map<string, string>();
  for (const cat of categories) {
    categoryMap.set(cat.slug, cat.id);
  }

  // 6. Generate each lesson
  for (const plan of weeklyPlans) {
    const categoryId = categoryMap.get(plan.category);
    if (!categoryId) {
      stats.errors.push(`Category not found in database: ${plan.category}`);
      continue;
    }

    for (const topic of plan.topics) {
      try {
        // Generate the lesson
        const lessonId = await generateSingleLesson({
          topic,
          categorySlug: plan.category,
          categoryId,
        });
        stats.generated++;

        // Review the lesson
        const review = await reviewLesson(lessonId);

        if (review.verdict === 'APPROVED') {
          // Publish the lesson
          const admin = createAdminClient();
          await admin
            .from('learning_lessons')
            .update({
              is_published: true,
              generation_status: 'approved',
            })
            .eq('id', lessonId);
          stats.approved++;
        } else {
          stats.rejected++;
        }

        // Record topic in history
        await recordTopicUsage(
          plan.category,
          topic.title,
          topic.keywords,
          topic.date
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        stats.errors.push(`Failed to generate "${topic.title}": ${errorMsg}`);
      }
    }
  }

  return stats;
}

/* ============================================
   GENERATE SINGLE LESSON
   ============================================ */

export async function generateSingleLesson(
  request: LessonGenerationRequest
): Promise<string> {
  const { topic, categorySlug, categoryId } = request;

  // 1. Select and fill the prompt
  const promptTemplate = selectPrompt(categorySlug, topic.format);
  const filledPrompt = prompts.fillTemplate(promptTemplate, {
    topic: topic.title,
    hook: topic.hook,
  });

  // 2. Call Claude API
  const client = getClient();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      messages: [{ role: 'user', content: filledPrompt }],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logApiCall({
      promptSent: filledPrompt,
      responseReceived: null,
      model: MODEL,
      status: 'error',
      errorMessage: errorMsg,
    });
    throw new Error(`Claude API call failed: ${errorMsg}`);
  }

  const content =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // 3. Extract excerpt (first paragraph, max 200 chars)
  const firstParagraph = content
    .split('\n')
    .find((line) => line.trim().length > 0 && !line.startsWith('#'));
  const excerpt = firstParagraph
    ? firstParagraph.slice(0, 200).trim()
    : topic.title;

  // 4. Extract sources from content if present
  const sourcesMatch = content.match(/## Sources\n([\s\S]*?)(?=\n## |$)/);
  const sources: string[] = [];
  if (sourcesMatch) {
    const sourceLines = sourcesMatch[1]
      .split('\n')
      .filter((line) => line.trim().startsWith('-') || line.trim().startsWith('*'));
    for (const line of sourceLines) {
      sources.push(line.replace(/^[\s\-*]+/, '').trim());
    }
  }

  // 5. Create the lesson record in Supabase
  const admin = createAdminClient();
  const slug = generateSlug(topic.title, topic.date);
  const readingTime = calculateReadingTime(content);

  const { data: lesson, error: insertError } = await admin
    .from('learning_lessons')
    .insert({
      category_id: categoryId,
      title: topic.title,
      slug,
      content,
      excerpt,
      format: topic.format,
      tags: topic.keywords,
      sources,
      reading_time_minutes: readingTime,
      published_date: topic.date,
      is_published: false,
      generation_prompt: filledPrompt,
      generation_model: MODEL,
      generation_status: 'review',
    })
    .select('id')
    .single();

  if (insertError || !lesson) {
    throw new Error(
      `Failed to insert lesson: ${insertError?.message ?? 'No data returned'}`
    );
  }

  const lessonId = lesson.id as string;

  // 6. Log the API call
  await logApiCall({
    lessonId,
    promptSent: filledPrompt,
    responseReceived: content,
    model: MODEL,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    status: 'success',
  });

  return lessonId;
}

/* ============================================
   SAFETY REVIEW
   ============================================ */

export async function reviewLesson(lessonId: string): Promise<SafetyReviewResult> {
  // 1. Fetch the lesson
  const { data: lesson, error: fetchError } = await supabase
    .from('learning_lessons')
    .select('title, content, format, category_id')
    .eq('id', lessonId)
    .single();

  if (fetchError || !lesson) {
    throw new Error(
      `Failed to fetch lesson for review: ${fetchError?.message ?? 'Not found'}`
    );
  }

  // Fetch category name for the review prompt
  const { data: category } = await supabase
    .from('learning_categories')
    .select('slug')
    .eq('id', lesson.category_id)
    .single();

  const categorySlug = (category?.slug as string) ?? 'unknown';

  // 2. Build the review prompt
  const filledPrompt = prompts.fillTemplate(prompts.SAFETY_REVIEW_PROMPT, {
    title: lesson.title as string,
    format: lesson.format as string,
    category: categorySlug,
    content: lesson.content as string,
  });

  // 3. Call Claude for review
  const client = getClient();
  let response: Anthropic.Message;
  try {
    response = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: filledPrompt }],
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    await logApiCall({
      lessonId,
      promptSent: filledPrompt,
      responseReceived: null,
      model: MODEL,
      status: 'error',
      errorMessage: errorMsg,
    });
    throw new Error(`Review API call failed: ${errorMsg}`);
  }

  const reviewText =
    response.content[0].type === 'text' ? response.content[0].text : '';

  // 4. Log the review API call
  await logApiCall({
    lessonId,
    promptSent: filledPrompt,
    responseReceived: reviewText,
    model: MODEL,
    inputTokens: response.usage?.input_tokens,
    outputTokens: response.usage?.output_tokens,
    status: 'success',
  });

  // 5. Parse the review result (strip markdown code fences if present)
  let result: SafetyReviewResult;
  try {
    const cleanedReview = reviewText
      .replace(/^```(?:json)?\s*\n?/gm, '')
      .replace(/\n?```\s*$/gm, '')
      .trim();
    result = JSON.parse(cleanedReview) as SafetyReviewResult;
  } catch {
    // If parsing fails, reject by default for safety
    result = {
      verdict: 'REJECTED',
      score: 0,
      flags: ['Failed to parse review response as JSON'],
      suggestions: ['Manual review required'],
    };
  }

  // 6. Update the lesson's generation_status
  const admin = createAdminClient();
  const newStatus = result.verdict === 'APPROVED' ? 'approved' : 'rejected';
  await admin
    .from('learning_lessons')
    .update({ generation_status: newStatus })
    .eq('id', lessonId);

  return result;
}

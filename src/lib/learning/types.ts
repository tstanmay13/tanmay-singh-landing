export interface LearningCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
}

export interface LearningLesson {
  id: string;
  category_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  format: 'article' | 'interactive' | 'quickbite';
  tags: string[];
  sources: string[];
  reading_time_minutes: number;
  published_date: string;
  is_published: boolean;
  generation_prompt: string | null;
  generation_model: string | null;
  generation_status: 'pending' | 'generating' | 'review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
  category?: LearningCategory;
}

export interface GenerationLog {
  id: string;
  lesson_id: string | null;
  prompt_sent: string;
  response_received: string | null;
  model: string;
  input_tokens: number | null;
  output_tokens: number | null;
  status: 'success' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface TopicHistory {
  id: string;
  category_slug: string;
  topic_title: string;
  topic_keywords: string[];
  used_date: string;
  created_at: string;
}

export interface WeeklyPlan {
  category: string;
  topics: PlannedTopic[];
}

export interface PlannedTopic {
  title: string;
  hook: string;
  format: 'article' | 'interactive' | 'quickbite';
  keywords: string[];
  date: string;
}

export interface LessonGenerationRequest {
  topic: PlannedTopic;
  categorySlug: string;
  categoryId: string;
}

export interface SafetyReviewResult {
  verdict: 'APPROVED' | 'REJECTED';
  score: number;
  flags: string[];
  suggestions: string[];
}

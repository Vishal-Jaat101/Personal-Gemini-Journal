export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: number;
  modelUsed?: string;
}

export interface SuggestedHabit {
  name: string;
  category?: string;
  frequency?: string;
  reason?: string;
}

export interface JournalSummary {
  title: string;
  summary: string;
  keyInsights: string[];
  mood: string;
  tags: string[];
  actionItems: string[];
  suggestedHabits?: SuggestedHabit[];
}

export interface JournalEntry {
  id: string;
  userId: string;
  title: string;
  summary: string;
  keyInsights: string[];
  mood: string;
  tags: string[];
  actionItems: string[];
  suggestedHabits?: SuggestedHabit[];
  messageCount: number;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  category?: string;
  frequency: string;
  source?: "manual" | "journal_suggestion";
  completedDates: Record<string, boolean>; // key format: YYYY-MM-DD
  streak?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReflectionPrompt {
  id: string;
  category: "Deep Reflection" | "Brainstorming" | "Gratitude & Wins" | "Untangling Stress" | "Goal Setting";
  title: string;
  prompt: string;
  icon: string;
}

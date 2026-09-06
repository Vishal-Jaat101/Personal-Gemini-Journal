import { GoogleGenAI } from "@google/genai";
import { getGeminiApiKey } from "./secrets.js";

// Resilient Model Fallback Ladder ordered by availability and latency
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
];

interface FallbackParams {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
}

/**
 * Standard Helper Implementation:
 * Resilient multi-model execution with automatic error recovery
 */
export async function generateContentWithFallback(params: FallbackParams): Promise<{
  text: string;
  modelUsed: string;
}> {
  const { key } = await getGeminiApiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  let lastError: any = null;

  for (const model of MODEL_FALLBACK_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          temperature: params.temperature ?? 0.7,
          ...(params.responseMimeType ? { responseMimeType: params.responseMimeType } : {}),
        },
      });

      const text = response.text || "";
      if (text) {
        return { text, modelUsed: model };
      }
    } catch (err: any) {
      console.warn(`[Gemini Fallback Matrix] Attempt on model '${model}' failed:`, err?.message || err);
      lastError = err;
      // Sequentially attempt the next model in the fallback chain
      continue;
    }
  }

  throw lastError || new Error("All Gemini fallback models exhausted without a valid response.");
}

export interface ChatMessageInput {
  role: "user" | "model";
  content: string;
}

/**
 * Multi-turn reflective journaling and brainstorming companion
 */
export async function generateJournalChatReply(
  messages: ChatMessageInput[],
  userContext?: { userName?: string; promptTheme?: string }
): Promise<{ reply: string; modelUsed: string }> {
  const systemInstruction = `You are a warm, thoughtful, and insightful Personal Journaling and Brainstorming Companion powered by Gemini.
Your mission is to help the user explore their thoughts, untangle complicated feelings, discover fresh perspectives, brainstorm solutions, and deepen self-awareness.

Guidelines:
1. Active Empathetic Listening: Validate emotions sincerely without being overly clinical or sycophantic.
2. Socratic & Generative Inquiry: Ask 1-2 open-ended, thought-provoking questions that help the user dig beneath the surface.
3. Psychological & Creative Reframing: If the user is stuck, offer gentle reframing, analogies, or practical creative frameworks (e.g., "What's the smallest step?", "What would happen if the constraint disappeared?").
4. Structure: Keep responses focused and readable (2-3 concise paragraphs maximum). Avoid gigantic walls of text so the conversation flows naturally.
5. Tone: Calm, reflective, encouraging, safe, and intellectually curious.
${userContext?.promptTheme ? `Current exploration theme: "${userContext.promptTheme}"` : ""}`;

  // Format into Gemini Content representation
  const contents = messages.map((m) => ({
    role: m.role === "model" ? "model" : "user",
    parts: [{ text: m.content || "" }],
  }));

  const { text, modelUsed } = await generateContentWithFallback({
    contents,
    systemInstruction,
    temperature: 0.75,
  });

  return { reply: text, modelUsed };
}

export interface SuggestedHabit {
  name: string;
  category?: string;
  frequency?: string;
  reason?: string;
}

export interface JournalSummaryOutput {
  title: string;
  summary: string;
  keyInsights: string[];
  mood: string;
  tags: string[];
  actionItems: string[];
  suggestedHabits?: SuggestedHabit[];
}

/**
 * Summarizes the multi-turn session into a structured journal entry and extracts habit commitments
 */
export async function generateSessionSummary(
  messages: ChatMessageInput[]
): Promise<{ summary: JournalSummaryOutput; modelUsed: string }> {
  const systemInstruction = `You are an expert reflective analyst and habit coach. Analyze the following multi-turn journaling and brainstorming conversation and produce a concise, high-value summary in strictly valid JSON.
Additionally, scan the entire conversation for explicit or implicit habit-related commitments, recurring practices, or lifestyle intentions the user expressed (e.g. "I want to start meditating daily", "I need to read before bed", "I will exercise each morning", "I want to drink more water"). Suggest 1 to 3 trackable daily habits derived directly from their conversation.

JSON Schema required:
{
  "title": "A short, evocative title (4-7 words)",
  "summary": "A cohesive 2-3 paragraph summary synthesizing what the user explored, feelings navigated, and core breakthroughs.",
  "keyInsights": ["Array of 2-4 key takeaways or realizations"],
  "mood": "Single dominant emotional tone (e.g., Clarified, Hopeful, Contemplative, Grounded, Determined, Relieved)",
  "tags": ["Array of 2-4 lowercase topic tags like #mindset, #productivity, #creativity, #balance"],
  "actionItems": ["Array of 1-3 practical next steps or intentions formulated during the chat"],
  "suggestedHabits": [
    {
      "name": "Actionable habit name (e.g., Daily 10-min Meditation, Morning Walk, Read 15 mins, Evening Screen Cutoff)",
      "category": "Mindfulness | Health & Fitness | Learning | Focus & Work | Well-being",
      "frequency": "Daily",
      "reason": "Brief context explaining why this habit reflects a commitment or intention from their journal session"
    }
  ]
}`;

  const conversationText = messages
    .map((m) => `${m.role === "user" ? "User" : "Gemini"}: ${m.content}`)
    .join("\n\n");

  const prompt = `Please analyze this journaling session and produce the structured JSON summary:\n\n${conversationText}`;

  const { text, modelUsed } = await generateContentWithFallback({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    systemInstruction,
    temperature: 0.4,
    responseMimeType: "application/json",
  });

  let parsed: JournalSummaryOutput;
  try {
    // Strip markdown formatting if any
    const cleanJson = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanJson);
    if (!Array.isArray(parsed.suggestedHabits)) {
      parsed.suggestedHabits = [];
    }
  } catch (err) {
    console.error("[Gemini Summary] JSON parse error:", err, "Raw text:", text);
    parsed = {
      title: "Reflective Journaling Session",
      summary: text.slice(0, 500),
      keyInsights: ["Explored personal reflections and brainstorming ideas."],
      mood: "Reflective",
      tags: ["#journal", "#reflection"],
      actionItems: ["Review conversation insights and apply today."],
      suggestedHabits: [],
    };
  }

  return { summary: parsed, modelUsed };
}

import { ReflectionPrompt } from "./types";

export const REFLECTION_PROMPTS: ReflectionPrompt[] = [
  {
    id: "clarify-decision",
    category: "Brainstorming",
    title: "Untangle a Difficult Decision",
    prompt:
      "I'm facing an important decision right now and feeling a bit torn. Help me examine the pros, trade-offs, and hidden assumptions so I can think with clarity.",
    icon: "Compass",
  },
  {
    id: "overcome-overwhelm",
    category: "Untangling Stress",
    title: "Process Stress & Overwhelm",
    prompt:
      "I'm carrying a lot on my mind today and feeling slightly overwhelmed. Can you guide me through a gentle inquiry to unpack what's urgent, what can wait, and what I can release?",
    icon: "CloudRain",
  },
  {
    id: "creative-breakthrough",
    category: "Brainstorming",
    title: "Creative Idea Incubator",
    prompt:
      "I have an embryonic idea or project I'd like to develop. Help me brainstorm angles, challenge my initial assumptions, and sketch out concrete directions.",
    icon: "Lightbulb",
  },
  {
    id: "weekly-reflection",
    category: "Deep Reflection",
    title: "Mindful Weekly Debrief",
    prompt:
      "I want to do a reflective debrief of my week. Ask me questions about what energized me, what drained me, and what key lessons I want to take forward.",
    icon: "Sparkles",
  },
  {
    id: "gratitude-wins",
    category: "Gratitude & Wins",
    title: "Acknowledge Quiet Wins",
    prompt:
      "I often rush to the next task without honoring progress. Guide me through identifying 3 subtle wins or moments of gratitude from recent days.",
    icon: "Smile",
  },
];

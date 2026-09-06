import React, { useState } from "react";
import {
  Flame,
  Plus,
  Check,
  Calendar,
  Sparkles,
  Trash2,
  Trophy,
  Target,
  ArrowRight,
  TrendingUp,
  Tag,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";
import { Habit, SuggestedHabit } from "../lib/types";
import { getLocalDateString } from "../lib/firebase";

interface HabitTrackerProps {
  habits: Habit[];
  onAddHabit: (name: string, category: string, frequency: string, source?: "manual" | "journal_suggestion") => Promise<void>;
  onToggleDay: (habit: Habit, dateStr: string) => Promise<void>;
  onDeleteHabit: (habitId: string) => Promise<void>;
  pendingSuggestions: SuggestedHabit[];
  onAcceptSuggestion: (suggestion: SuggestedHabit) => Promise<void>;
  onDismissSuggestion: (name: string) => void;
  isLoading: boolean;
  isAuthenticated: boolean;
  onOpenAuth: () => void;
  userUid?: string;
}

const HABIT_PRESETS = [
  { name: "Daily Meditation (10 min)", category: "Mindfulness" },
  { name: "Morning Exercise", category: "Health & Fitness" },
  { name: "Read 15-20 Pages", category: "Learning & Growth" },
  { name: "Hydrate & Drink 2L Water", category: "Health & Fitness" },
  { name: "Evening Journal Reflection", category: "Mindfulness" },
  { name: "No Screens 30m Before Bed", category: "Well-being" },
];

const CATEGORIES = [
  "Mindfulness",
  "Health & Fitness",
  "Learning & Growth",
  "Focus & Productivity",
  "Well-being",
  "Creativity",
  "Other",
];

export const HabitTracker: React.FC<HabitTrackerProps> = ({
  habits,
  onAddHabit,
  onToggleDay,
  onDeleteHabit,
  pendingSuggestions,
  onAcceptSuggestion,
  onDismissSuggestion,
  isLoading,
  isAuthenticated,
  onOpenAuth,
  userUid,
}) => {
  const [newHabitName, setNewHabitName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Mindfulness");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Generate the past 7 days: [6 days ago, ..., today]
  const today = new Date();
  const past7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(today.getDate() - (6 - i));
    const dateStr = getLocalDateString(d);
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const isToday = i === 6;
    return { dateStr, dayName, dayNum, isToday };
  });

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim()) {
      setFormError("Please enter a habit name.");
      return;
    }
    setFormError(null);
    setIsSubmitting(true);
    try {
      await onAddHabit(newHabitName.trim(), selectedCategory, "Daily", "manual");
      setNewHabitName("");
    } catch (err: any) {
      setFormError(err.message || "Failed to create habit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickAdd = async (preset: { name: string; category: string }) => {
    setIsSubmitting(true);
    try {
      await onAddHabit(preset.name, preset.category, "Daily", "manual");
    } catch (err: any) {
      setFormError(err.message || "Failed to add preset habit.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate high-level summary metrics
  const totalHabits = habits.length;
  const todayStr = past7Days[6].dateStr;
  const completedTodayCount = habits.filter((h) => !!h.completedDates?.[todayStr]).length;
  const completionRate = totalHabits > 0 ? Math.round((completedTodayCount / totalHabits) * 100) : 0;
  const maxStreak = habits.reduce((max, h) => Math.max(max, h.streak || 0), 0);

  return (
    <div id="habit-tracker-container" className="space-y-6 animate-in fade-in duration-200">
      {/* Overview Metric Banner */}
      <div
        id="habit-metrics-banner"
        className="bg-stone-900 text-stone-100 rounded-2xl p-5 sm:p-6 shadow-sm border border-stone-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-5"
      >
        <div className="space-y-1">
          <div className="flex items-center space-x-2 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Daily Habit Momentum</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-white tracking-tight">
            Consistency &amp; Micro-Habits
          </h2>
          <p className="text-xs text-stone-400 max-w-xl">
            Track daily commitments with 7-day streak visualizers. Habits identified in your journal reflections appear as automated suggestions below.
          </p>
          <div className="flex items-center space-x-1.5 text-[11px] text-stone-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Scoped strictly to Firestore /users/{userUid ? userUid.slice(0, 6) + "..." : "uid"}/habits</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 sm:space-x-6 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-stone-800">
          <div className="text-center px-3 py-1">
            <div className="text-2xl font-bold text-amber-300 font-serif">
              {completedTodayCount} / {totalHabits}
            </div>
            <div className="text-[11px] text-stone-400 font-medium">Done Today</div>
          </div>
          <div className="h-9 w-px bg-stone-800" />
          <div className="text-center px-3 py-1">
            <div className="text-2xl font-bold text-white font-serif">{completionRate}%</div>
            <div className="text-[11px] text-stone-400 font-medium">Today's Progress</div>
          </div>
          <div className="h-9 w-px bg-stone-800" />
          <div className="text-center px-3 py-1">
            <div className="text-2xl font-bold text-amber-400 flex items-center justify-center space-x-1 font-serif">
              <Flame className="w-5 h-5 text-amber-500 fill-amber-500" />
              <span>{maxStreak}d</span>
            </div>
            <div className="text-[11px] text-stone-400 font-medium">Top Streak</div>
          </div>
        </div>
      </div>

      {/* Suggested Habits from Journal Session Banner (If Any) */}
      {pendingSuggestions && pendingSuggestions.length > 0 && (
        <div
          id="journal-suggested-habits-section"
          className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-amber-200/80 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-amber-900" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-amber-950 font-serif">
                  Detected Commitments from Recent Journal Session
                </h3>
                <p className="text-[11px] text-amber-800">
                  Gemini identified these habit commitments from your reflection chat. Add them to track daily progress.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingSuggestions.map((suggestion, idx) => (
              <div
                key={idx}
                id={`suggestion-card-${idx}`}
                className="bg-white/90 border border-amber-200 rounded-xl p-3.5 flex flex-col justify-between space-y-2.5 hover:shadow-xs transition-shadow"
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md">
                      {suggestion.category || "Habit"}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {suggestion.frequency || "Daily"}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-stone-900 leading-snug">
                    {suggestion.name}
                  </h4>
                  {suggestion.reason && (
                    <p className="text-[11px] text-stone-500 mt-1 line-clamp-2 leading-relaxed">
                      "{suggestion.reason}"
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2 pt-1">
                  <button
                    id={`accept-suggestion-btn-${idx}`}
                    onClick={() => onAcceptSuggestion(suggestion)}
                    className="flex-1 px-2.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Track Habit</span>
                  </button>
                  <button
                    id={`dismiss-suggestion-btn-${idx}`}
                    onClick={() => onDismissSuggestion(suggestion.name)}
                    className="px-2 py-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg text-xs transition-colors cursor-pointer"
                    title="Dismiss suggestion"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manual Habit Creation Form & Presets */}
      <div
        id="habit-creation-card"
        className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-stone-900 font-serif">
              Add a New Daily Habit
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            {totalHabits} habit{totalHabits === 1 ? "" : "s"} tracked
          </span>
        </div>

        <form onSubmit={handleCreateHabit} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              id="new-habit-input"
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="e.g., Meditate for 10 minutes, Morning Run, Read 20 pages..."
              className="flex-1 bg-stone-50 border border-stone-300 rounded-xl px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:outline-none focus:border-stone-900 focus:bg-white transition-colors"
            />

            <select
              id="new-habit-category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-stone-50 border border-stone-300 rounded-xl px-3 py-2.5 text-xs text-stone-700 focus:outline-none focus:border-stone-900 shrink-0 cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            <button
              id="add-habit-submit-btn"
              type="submit"
              disabled={isSubmitting || !newHabitName.trim()}
              className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 shrink-0 transition-colors shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-300" />
              <span>{isSubmitting ? "Adding..." : "Add Habit"}</span>
            </button>
          </div>

          {formError && (
            <p className="text-xs text-red-600 font-medium pl-1">{formError}</p>
          )}
        </form>

        {/* Quick-add presets */}
        <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-stone-400 mr-1 flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Quick add:</span>
          </span>
          {HABIT_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              id={`preset-habit-btn-${idx}`}
              onClick={() => handleQuickAdd(preset)}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium transition-colors cursor-pointer"
            >
              + {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Habits List with 7-Day Streak Grid */}
      <div id="habits-list-section" className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>Your Daily Habits &amp; 7-Day View</span>
          </h3>
          <span className="text-[11px] text-stone-400">
            Click any day to toggle completion
          </span>
        </div>

        {habits.length === 0 ? (
          <div
            id="empty-habits-state"
            className="bg-white border border-dashed border-stone-300 rounded-2xl p-8 sm:p-12 text-center space-y-3"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6 text-amber-600" />
            </div>
            <h4 className="text-base font-bold font-serif text-stone-900">
              No Habits Tracked Yet
            </h4>
            <p className="text-xs text-stone-500 max-w-sm mx-auto leading-relaxed">
              Build lasting momentum by adding daily habits manually above, or reflect in a journal session to let Gemini identify habits from your commitments.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {habits.map((habit) => {
              const currentStreak = habit.streak || 0;
              const completed7Count = past7Days.filter(
                (d) => !!habit.completedDates?.[d.dateStr]
              ).length;

              return (
                <div
                  key={habit.id}
                  id={`habit-card-${habit.id}`}
                  className="bg-white border border-stone-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-stone-300 transition-all space-y-4"
                >
                  {/* Habit Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-bold text-stone-900 font-serif tracking-tight">
                          {habit.name}
                        </h4>
                        {habit.category && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-stone-100 text-stone-600 border border-stone-200">
                            {habit.category}
                          </span>
                        )}
                        {habit.source === "journal_suggestion" && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200 flex items-center space-x-1">
                            <Sparkles className="w-2.5 h-2.5 text-amber-600" />
                            <span>Journal Derived</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-3 text-[11px] text-stone-500">
                        <span>{completed7Count}/7 days completed this week</span>
                        <span>&bull;</span>
                        <span>{habit.frequency || "Daily"}</span>
                      </div>
                    </div>

                    {/* Streak Badge & Actions */}
                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <div
                        id={`habit-streak-badge-${habit.id}`}
                        className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold ${
                          currentStreak > 0
                            ? "bg-amber-100 text-amber-900 border border-amber-200"
                            : "bg-stone-100 text-stone-500"
                        }`}
                      >
                        <Flame
                          className={`w-3.5 h-3.5 ${
                            currentStreak > 0
                              ? "text-amber-600 fill-amber-600 animate-pulse"
                              : "text-stone-400"
                          }`}
                        />
                        <span>{currentStreak} Day Streak</span>
                      </div>

                      <button
                        id={`delete-habit-btn-${habit.id}`}
                        onClick={() => {
                          if (window.confirm(`Delete habit "${habit.name}"?`)) {
                            onDeleteHabit(habit.id);
                          }
                        }}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete habit"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 7-Day Streak & Daily Checkbox Matrix */}
                  <div className="pt-2 border-t border-stone-100">
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                      {past7Days.map((day) => {
                        const isDone = !!habit.completedDates?.[day.dateStr];
                        return (
                          <button
                            key={day.dateStr}
                            id={`habit-${habit.id}-day-${day.dateStr}`}
                            onClick={() => onToggleDay(habit, day.dateStr)}
                            title={`${day.dayName}, ${day.dateStr}: ${isDone ? "Mark Incomplete" : "Mark Complete"}`}
                            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all cursor-pointer border min-h-[58px] ${
                              isDone
                                ? "bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 shadow-2xs"
                                : day.isToday
                                ? "bg-stone-50 border-amber-300 text-stone-800 hover:bg-stone-100"
                                : "bg-stone-50/60 border-stone-200 text-stone-500 hover:bg-stone-100 hover:border-stone-300"
                            }`}
                          >
                            <span className="text-[10px] font-semibold uppercase tracking-wider">
                              {day.dayName}
                            </span>
                            <span className="text-xs font-bold mt-0.5">
                              {day.dayNum}
                            </span>

                            <div className="mt-1.5 flex items-center justify-center">
                              {isDone ? (
                                <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              ) : (
                                <div
                                  className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                    day.isToday
                                      ? "border-amber-400 bg-white"
                                      : "border-stone-300 bg-white"
                                  }`}
                                >
                                  {day.isToday && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                  )}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

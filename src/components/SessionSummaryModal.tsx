import React, { useState } from "react";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  ListTodo,
  Lightbulb,
  Heart,
  Save,
  RefreshCw,
  Edit3,
  Plus,
  Check,
  Flame,
} from "lucide-react";
import { JournalSummary, SuggestedHabit } from "../lib/types";

interface SessionSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: JournalSummary | null;
  onConfirmSave: (finalSummary: JournalSummary) => Promise<void>;
  isSaving: boolean;
  saveError: string | null;
  onRetrySave: () => void;
  onTrackSuggestedHabit?: (suggestion: SuggestedHabit) => Promise<void>;
}

export const SessionSummaryModal: React.FC<SessionSummaryModalProps> = ({
  isOpen,
  onClose,
  summary,
  onConfirmSave,
  isSaving,
  saveError,
  onRetrySave,
  onTrackSuggestedHabit,
}) => {
  if (!isOpen || !summary) return null;

  const [editableTitle, setEditableTitle] = useState(summary.title);
  const [editableSummary, setEditableSummary] = useState(summary.summary);
  const [isEditing, setIsEditing] = useState(false);
  const [trackedHabits, setTrackedHabits] = useState<Record<string, boolean>>({});
  const [trackingLoading, setTrackingLoading] = useState<Record<string, boolean>>({});

  const handleTrackHabit = async (suggestion: SuggestedHabit) => {
    if (!onTrackSuggestedHabit || trackedHabits[suggestion.name]) return;
    setTrackingLoading((prev) => ({ ...prev, [suggestion.name]: true }));
    try {
      await onTrackSuggestedHabit(suggestion);
      setTrackedHabits((prev) => ({ ...prev, [suggestion.name]: true }));
    } catch (err) {
      console.error("Failed to track suggested habit:", err);
    } finally {
      setTrackingLoading((prev) => ({ ...prev, [suggestion.name]: false }));
    }
  };

  const handleSave = async () => {
    await onConfirmSave({
      ...summary,
      title: editableTitle.trim() || summary.title,
      summary: editableSummary.trim() || summary.summary,
    });
  };

  return (
    <div
      id="session-summary-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in"
    >
      <div
        id="session-summary-card"
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden my-8"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 text-amber-300 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900 font-serif">
                Session Reflection &amp; AI Summary
              </h2>
              <p className="text-xs text-stone-500">
                Generated from multi-turn discussion &bull; Saving to /users/{"{uid}"}/journals/
              </p>
            </div>
          </div>
          <button
            id="summary-modal-close-btn"
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1.5 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {saveError && (
            <div
              id="summary-save-error-banner"
              className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start justify-between text-xs text-red-700 animate-in fade-in"
            >
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold mb-0.5">Firestore Save Failed</div>
                  <div>{saveError}</div>
                </div>
              </div>
              <button
                id="summary-retry-save-btn"
                onClick={onRetrySave}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-semibold rounded-lg shrink-0 cursor-pointer ml-3 flex items-center space-x-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry Save</span>
              </button>
            </div>
          )}

          {/* Title and Mood */}
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Journal Entry Title
                </span>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="text-stone-400 hover:text-stone-700 transition-colors p-1"
                  title="Toggle editing title and summary"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>

              {summary.mood && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">
                  <Heart className="w-3 h-3 mr-1.5 text-amber-700" />
                  Mood: {summary.mood}
                </span>
              )}
            </div>

            {isEditing ? (
              <input
                id="summary-title-input"
                type="text"
                value={editableTitle}
                onChange={(e) => setEditableTitle(e.target.value)}
                className="w-full text-base font-bold text-stone-900 bg-white border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-stone-900 font-serif"
              />
            ) : (
              <h3 className="text-base font-bold text-stone-900 font-serif">
                {editableTitle}
              </h3>
            )}
          </div>

          {/* Synthesized Summary Narrative */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
              <span>Executive Synthesis</span>
            </h4>
            {isEditing ? (
              <textarea
                id="summary-content-textarea"
                rows={4}
                value={editableSummary}
                onChange={(e) => setEditableSummary(e.target.value)}
                className="w-full text-sm text-stone-800 bg-stone-50 border border-stone-300 rounded-xl p-3 focus:outline-none focus:border-stone-900 leading-relaxed font-sans"
              />
            ) : (
              <div className="text-sm text-stone-700 bg-stone-50/70 border border-stone-200 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                {editableSummary}
              </div>
            )}
          </div>

          {/* Key Insights */}
          {summary.keyInsights && summary.keyInsights.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                <span>Key Insights &amp; Takeaways</span>
              </h4>
              <div className="space-y-1.5">
                {summary.keyInsights.map((insight, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 text-xs text-stone-800 bg-white border border-stone-200 rounded-lg p-2.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{insight}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Items / Intentions */}
          {summary.actionItems && summary.actionItems.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                <span>Actionable Intentions &amp; Next Steps</span>
              </h4>
              <div className="space-y-1.5">
                {summary.actionItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-start space-x-2.5 text-xs text-stone-800 bg-white border border-stone-200 rounded-lg p-2.5"
                  >
                    <div className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300 text-[10px] font-bold text-stone-600 flex items-center justify-center shrink-0">
                      {idx + 1}
                    </div>
                    <span className="leading-snug">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Detected Habit Commitments from Conversation */}
          {summary.suggestedHabits && summary.suggestedHabits.length > 0 && (
            <div className="space-y-2 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-900 flex items-center space-x-1.5">
                  <Flame className="w-3.5 h-3.5 text-amber-600" />
                  <span>Detected Habit Commitments</span>
                </h4>
                <span className="text-[10px] text-amber-700 font-medium">
                  Scan from reflection chat
                </span>
              </div>
              <div className="space-y-2">
                {summary.suggestedHabits.map((habit, idx) => {
                  const isTracked = !!trackedHabits[habit.name];
                  const isLoading = !!trackingLoading[habit.name];

                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-2 p-2.5 bg-white border border-amber-200 rounded-lg text-xs"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-stone-900 truncate">
                            {habit.name}
                          </span>
                          {habit.category && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-stone-100 text-stone-600">
                              {habit.category}
                            </span>
                          )}
                        </div>
                        {habit.reason && (
                          <p className="text-[11px] text-stone-500 line-clamp-1">
                            {habit.reason}
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        id={`summary-track-habit-btn-${idx}`}
                        disabled={isTracked || isLoading}
                        onClick={() => handleTrackHabit(habit)}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0 transition-all cursor-pointer ${
                          isTracked
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300 cursor-default"
                            : "bg-stone-900 hover:bg-stone-800 text-amber-300 shadow-2xs"
                        }`}
                      >
                        {isTracked ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-700 stroke-[3]" />
                            <span>Tracked!</span>
                          </>
                        ) : isLoading ? (
                          <>
                            <RefreshCw className="w-3 h-3 animate-spin text-amber-300" />
                            <span>Adding...</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 text-amber-300" />
                            <span>Track as Daily Habit</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Topic Tags */}
          {summary.tags && summary.tags.length > 0 && (
            <div className="flex items-center space-x-2 pt-2 border-t border-stone-100">
              <Tag className="w-3.5 h-3.5 text-stone-400 shrink-0" />
              <div className="flex flex-wrap gap-1.5">
                {summary.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200"
                  >
                    {tag.startsWith("#") ? tag : `#${tag}`}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <button
            id="summary-keep-chatting-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
          >
            Continue Chatting
          </button>

          <button
            id="summary-save-firestore-btn"
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center space-x-2 shadow-xs cursor-pointer transition-all"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                <span>Saving to Firestore...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>Confirm &amp; Save Entry</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

import React, { useState } from "react";
import {
  Calendar,
  Search,
  Tag,
  Trash2,
  ChevronRight,
  Sparkles,
  MessageSquare,
  Lightbulb,
  ListTodo,
  Heart,
  X,
  BookOpen,
  ArrowLeft,
  Share2,
  Check,
} from "lucide-react";
import { JournalEntry } from "../lib/types";

interface JournalHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onDeleteEntry: (entryId: string) => Promise<void>;
  onSelectEntryForViewing?: (entry: JournalEntry) => void;
  isLoading: boolean;
}

export const JournalHistory: React.FC<JournalHistoryProps> = ({
  isOpen,
  onClose,
  entries,
  onDeleteEntry,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [copiedTranscript, setCopiedTranscript] = useState(false);

  if (!isOpen) return null;

  // Filter entries
  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      searchQuery === "" ||
      entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMood = selectedMood === null || entry.mood === selectedMood;

    return matchesSearch && matchesMood;
  });

  const uniqueMoods = Array.from(
    new Set(entries.map((e) => e.mood).filter(Boolean))
  ) as string[];

  const handleDelete = async (entryId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this journal entry from Cloud Firestore?")) {
      setIsDeletingId(entryId);
      try {
        await onDeleteEntry(entryId);
        if (selectedEntry?.id === entryId) {
          setSelectedEntry(null);
        }
      } finally {
        setIsDeletingId(null);
      }
    }
  };

  const handleCopyMarkdown = (entry: JournalEntry) => {
    const md = `# ${entry.title}
Date: ${new Date(entry.createdAt).toLocaleDateString()}
Mood: ${entry.mood || "N/A"}
Tags: ${(entry.tags || []).join(", ")}

## Summary
${entry.summary}

## Key Insights
${(entry.keyInsights || []).map((i) => `- ${i}`).join("\n")}

## Action Items
${(entry.actionItems || []).map((a) => `- [ ] ${a}`).join("\n")}

## Conversation Transcript
${(entry.messages || [])
  .map((m) => `**${m.role === "user" ? "You" : "Gemini"}:**\n${m.content}\n`)
  .join("\n")}
`;
    navigator.clipboard.writeText(md);
    setCopiedTranscript(true);
    setTimeout(() => setCopiedTranscript(false), 2000);
  };

  return (
    <div
      id="journal-history-backdrop"
      className="fixed inset-0 z-50 flex justify-end bg-stone-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
    >
      <div
        id="journal-history-panel"
        className="w-full max-w-2xl h-full bg-white shadow-2xl flex flex-col border-l border-stone-200 animate-in slide-in-from-right duration-300"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {selectedEntry && (
              <button
                id="history-back-btn"
                onClick={() => setSelectedEntry(null)}
                className="p-1.5 rounded-lg text-stone-500 hover:text-stone-900 hover:bg-stone-200/60 transition-colors mr-1"
                title="Back to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div className="w-8 h-8 rounded-lg bg-stone-900 text-amber-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-amber-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 font-serif">
                {selectedEntry ? "Journal Entry Detail" : "Past Journal Entries"}
              </h2>
              <p className="text-[11px] text-stone-500">
                Cloud Firestore &bull; /users/{"{uid}"}/journals ({entries.length} total)
              </p>
            </div>
          </div>

          <button
            id="history-close-btn"
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-200/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Entry Detail View */}
        {selectedEntry ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div>
                <span className="text-[11px] text-stone-400 flex items-center space-x-1.5 mb-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {new Date(selectedEntry.createdAt).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
                <h3 className="text-xl font-bold text-stone-900 font-serif leading-tight">
                  {selectedEntry.title}
                </h3>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="export-markdown-btn"
                  onClick={() => handleCopyMarkdown(selectedEntry)}
                  className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-lg text-xs flex items-center space-x-1 transition-colors border border-stone-200"
                  title="Copy as Markdown"
                >
                  {copiedTranscript ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Export</span>
                    </>
                  )}
                </button>
                <button
                  id="delete-detail-entry-btn"
                  onClick={(e) => handleDelete(selectedEntry.id, e)}
                  disabled={isDeletingId === selectedEntry.id}
                  className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg text-xs transition-colors border border-stone-200"
                  title="Delete entry"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Mood & Tags */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedEntry.mood && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-900 border border-amber-200">
                  <Heart className="w-3 h-3 mr-1 text-amber-700" />
                  {selectedEntry.mood}
                </span>
              )}
              {selectedEntry.tags?.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-stone-100 text-stone-600 border border-stone-200"
                >
                  {t.startsWith("#") ? t : `#${t}`}
                </span>
              ))}
            </div>

            {/* Summary */}
            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500">
                Synthesis &amp; Reflection
              </h4>
              <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl text-sm leading-relaxed text-stone-800 whitespace-pre-wrap">
                {selectedEntry.summary}
              </div>
            </div>

            {/* Key Insights */}
            {selectedEntry.keyInsights && selectedEntry.keyInsights.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                  <span>Key Insights</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedEntry.keyInsights.map((insight, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 flex items-start space-x-2"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>{insight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {selectedEntry.actionItems && selectedEntry.actionItems.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                  <ListTodo className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Action Items &amp; Next Steps</span>
                </h4>
                <div className="space-y-1.5">
                  {selectedEntry.actionItems.map((action, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-stone-200 rounded-lg text-xs text-stone-800 flex items-start space-x-2"
                    >
                      <span className="w-4 h-4 rounded-full bg-stone-100 border border-stone-300 text-[10px] font-bold text-stone-600 flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span>{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Full Conversation Transcript */}
            {selectedEntry.messages && selectedEntry.messages.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-stone-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-500 flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-stone-400" />
                    <span>Chat Dialogue Transcript ({selectedEntry.messages.length} messages)</span>
                  </h4>
                </div>
                <div className="space-y-3 bg-stone-50/60 p-3 rounded-xl border border-stone-200">
                  {selectedEntry.messages.map((m) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl text-xs leading-relaxed ${
                        m.role === "user"
                          ? "bg-stone-900 text-white ml-6"
                          : "bg-white border border-stone-200 text-stone-800 mr-6"
                      }`}
                    >
                      <div className="font-semibold text-[10px] mb-1 opacity-70">
                        {m.role === "user" ? "You" : "Gemini"}
                      </div>
                      <div className="whitespace-pre-wrap">{m.content}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* Entry List View */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Mood Filter */}
            <div className="p-4 border-b border-stone-200 space-y-3 bg-white">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-stone-400" />
                <input
                  id="history-search-input"
                  type="text"
                  placeholder="Search journals by title, tag, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:border-stone-900 transition-colors"
                />
              </div>

              {uniqueMoods.length > 0 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                  <button
                    onClick={() => setSelectedMood(null)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                      selectedMood === null
                        ? "bg-stone-900 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    All Moods
                  </button>
                  {uniqueMoods.map((mood) => (
                    <button
                      key={mood}
                      onClick={() => setSelectedMood(selectedMood === mood ? null : mood)}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors shrink-0 cursor-pointer ${
                        selectedMood === mood
                          ? "bg-amber-800 text-amber-100"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {mood}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* List */}
            <div
              id="history-entry-list"
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-stone-50/50"
            >
              {isLoading ? (
                <div className="py-12 text-center text-xs text-stone-500">
                  <div className="w-6 h-6 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin mx-auto mb-2" />
                  <span>Loading your journals from Cloud Firestore...</span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-16 text-center text-stone-400 max-w-xs mx-auto">
                  <BookOpen className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                  <p className="text-xs font-medium text-stone-600 mb-1">
                    No matching journal entries found
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Complete your multi-turn chat and click &ldquo;Save &amp; Summarize&rdquo; to create your first entry.
                  </p>
                </div>
              ) : (
                filteredEntries.map((entry) => (
                  <div
                    key={entry.id}
                    id={`history-item-${entry.id}`}
                    onClick={() => setSelectedEntry(entry)}
                    className="p-4 bg-white border border-stone-200 hover:border-stone-400 rounded-xl transition-all shadow-2xs cursor-pointer group relative"
                  >
                    <div className="flex items-start justify-between mb-1.5">
                      <div className="flex items-center space-x-2 text-[11px] text-stone-400">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                        {entry.mood && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                            {entry.mood}
                          </span>
                        )}
                      </div>

                      <button
                        id={`delete-entry-${entry.id}-btn`}
                        onClick={(e) => handleDelete(entry.id, e)}
                        disabled={isDeletingId === entry.id}
                        className="opacity-0 group-hover:opacity-100 p-1 text-stone-400 hover:text-red-600 transition-opacity"
                        title="Delete entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <h4 className="text-sm font-bold text-stone-900 font-serif mb-1 group-hover:text-amber-900 transition-colors">
                      {entry.title}
                    </h4>

                    <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed mb-2.5">
                      {entry.summary}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-stone-400 pt-2 border-t border-stone-100">
                      <div className="flex items-center space-x-1.5">
                        <MessageSquare className="w-3 h-3" />
                        <span>{entry.messageCount || entry.messages?.length || 0} messages</span>
                      </div>
                      <div className="flex items-center space-x-1 text-stone-700 font-medium group-hover:translate-x-0.5 transition-transform">
                        <span>Read Entry</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

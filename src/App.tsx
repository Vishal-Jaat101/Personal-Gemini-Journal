import React, { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import {
  subscribeToAuth,
  logOut,
  saveJournalEntry,
  fetchUserJournals,
  removeJournalEntry,
  saveHabit,
  fetchUserHabits,
  toggleHabitDay,
  removeHabit,
} from "./lib/firebase";
import { ChatMessage, JournalEntry, JournalSummary, Habit, SuggestedHabit } from "./lib/types";
import { Header } from "./components/Header";
import { ChatInterface } from "./components/ChatInterface";
import { HabitTracker } from "./components/HabitTracker";
import { AuthModal } from "./components/AuthModal";
import { SessionSummaryModal } from "./components/SessionSummaryModal";
import { JournalHistory } from "./components/JournalHistory";
import { CheckCircle2, AlertCircle, Info, Sparkles, BookMarked, ShieldCheck } from "lucide-react";

export default function App() {
  // Navigation active tab: "journal" | "habits"
  const [activeTab, setActiveTab] = useState<"journal" | "habits">("journal");

  // Auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authRequiredNotice, setAuthRequiredNotice] = useState<string | null>(null);

  // Journal conversation state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Summarization & Persistence state
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [activeSummary, setActiveSummary] = useState<JournalSummary | null>(null);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [isSavingToFirestore, setIsSavingToFirestore] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Journal entries collection state
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [isLoadingJournals, setIsLoadingJournals] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Habits State
  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoadingHabits, setIsLoadingHabits] = useState(false);
  const [pendingHabitSuggestions, setPendingHabitSuggestions] = useState<SuggestedHabit[]>([]);

  // Notification Toast
  const [toast, setToast] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  const showToast = (text: string, type: "success" | "error" | "info" = "info") => {
    setToast({ text, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Subscribe to Firebase Auth
  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setCurrentUser(user);
      if (user) {
        loadUserJournals(user.uid);
        loadUserHabits(user.uid);
      } else {
        setJournals([]);
        setHabits([]);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load journals from Firestore scoped to user UID
  const loadUserJournals = useCallback(async (uid: string) => {
    setIsLoadingJournals(true);
    try {
      const data = await fetchUserJournals(uid);
      setJournals(data);
    } catch (err: any) {
      console.error("Error loading user journals:", err);
    } finally {
      setIsLoadingJournals(false);
    }
  }, []);

  // Load habits from Firestore scoped to user UID
  const loadUserHabits = useCallback(async (uid: string) => {
    setIsLoadingHabits(true);
    try {
      const data = await fetchUserHabits(uid);
      setHabits(data);
    } catch (err: any) {
      console.error("Error loading user habits:", err);
    } finally {
      setIsLoadingHabits(false);
    }
  }, []);

  // Habit operations
  const handleAddHabit = async (
    name: string,
    category: string = "Mindfulness",
    frequency: string = "Daily",
    source: "manual" | "journal_suggestion" = "manual"
  ) => {
    if (!currentUser) {
      setAuthRequiredNotice("Please sign in or create an account to persist your habits in Cloud Firestore.");
      setIsAuthModalOpen(true);
      return;
    }

    const habitId = `habit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newHabit: Habit = {
      id: habitId,
      userId: currentUser.uid,
      name,
      category,
      frequency,
      source,
      completedDates: {},
      streak: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveHabit(currentUser.uid, newHabit);
    if (result.success) {
      setHabits((prev) => [newHabit, ...prev.filter((h) => h.id !== habitId)]);
      showToast(`Habit "${name}" saved to Cloud Firestore under /users/.../habits/${habitId}`, "success");
    } else {
      showToast(result.error || "Failed to save habit to Firestore.", "error");
      throw new Error(result.error);
    }
  };

  const handleToggleHabitDay = async (habit: Habit, dateStr: string) => {
    if (!currentUser) {
      setAuthRequiredNotice("Sign in to track and record daily habit completions.");
      setIsAuthModalOpen(true);
      return;
    }

    const res = await toggleHabitDay(currentUser.uid, habit, dateStr);
    if (res.success && res.updatedHabit) {
      setHabits((prev) =>
        prev.map((h) => (h.id === habit.id ? res.updatedHabit! : h))
      );
    } else {
      showToast(res.error || "Failed to update habit status.", "error");
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    if (!currentUser) return;
    const res = await removeHabit(currentUser.uid, habitId);
    if (res.success) {
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      showToast("Habit deleted from Firestore.", "info");
    } else {
      showToast(res.error || "Failed to delete habit.", "error");
    }
  };

  const handleAcceptHabitSuggestion = async (suggestion: SuggestedHabit) => {
    await handleAddHabit(
      suggestion.name,
      suggestion.category || "Mindfulness",
      suggestion.frequency || "Daily",
      "journal_suggestion"
    );
    setPendingHabitSuggestions((prev) =>
      prev.filter((s) => s.name !== suggestion.name)
    );
  };

  const handleDismissHabitSuggestion = (name: string) => {
    setPendingHabitSuggestions((prev) => prev.filter((s) => s.name !== name));
  };

  const handleTrackSuggestedHabitFromModal = async (suggestion: SuggestedHabit) => {
    await handleAddHabit(
      suggestion.name,
      suggestion.category || "Mindfulness",
      suggestion.frequency || "Daily",
      "journal_suggestion"
    );
    setPendingHabitSuggestions((prev) =>
      prev.filter((s) => s.name !== suggestion.name)
    );
  };

  // Handle sending multi-turn chat message to Gemini backend
  const handleSendMessage = async (userText: string) => {
    setChatError(null);
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: "user",
      content: userText,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsThinking(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            userName: currentUser?.displayName || currentUser?.email || "Journaler",
          },
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const data = await response.json();
      const modelMsg: ChatMessage = {
        id: `msg_${Date.now()}_model`,
        role: "model",
        content: data.reply || "I am reflecting on your thoughts.",
        timestamp: data.timestamp || Date.now(),
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error("Chat turn error:", err);
      setChatError(err.message || "Failed to reach Gemini. Please try again.");
    } finally {
      setIsThinking(false);
    }
  };

  // Retry last message if error occurred
  const handleRetryLastMessage = () => {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMessage) {
      // Remove failed state and resend
      setChatError(null);
      handleSendMessage(lastUserMessage.content);
    }
  };

  // Trigger Session Summarization
  const handleSummarizeSession = async () => {
    // If not authenticated, require sign-in first to safeguard user journal data
    if (!currentUser) {
      setAuthRequiredNotice("Please sign in or create an account with Firebase to summarize and persist your journal entry.");
      setIsAuthModalOpen(true);
      return;
    }

    if (messages.length === 0) {
      showToast("Cannot summarize an empty conversation.", "error");
      return;
    }

    setIsSummarizing(true);
    setSaveError(null);

    try {
      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Failed to summarize session (HTTP ${response.status})`);
      }

      const data = await response.json();
      setActiveSummary(data.summary);

      if (Array.isArray(data.summary?.suggestedHabits) && data.summary.suggestedHabits.length > 0) {
        setPendingHabitSuggestions((prev) => {
          const existingNames = new Set(prev.map((s) => s.name.toLowerCase()));
          const newItems = data.summary.suggestedHabits.filter(
            (s: SuggestedHabit) => !existingNames.has(s.name.toLowerCase())
          );
          return [...newItems, ...prev];
        });
      }

      setIsSummaryModalOpen(true);
    } catch (err: any) {
      console.error("Summarization error:", err);
      showToast(err.message || "Failed to generate summary.", "error");
    } finally {
      setIsSummarizing(false);
    }
  };

  // Confirm and persist to Cloud Firestore under /users/{uid}/journals/{entryId}
  const handleConfirmSaveToFirestore = async (finalSummary: JournalSummary) => {
    if (!currentUser) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsSavingToFirestore(true);
    setSaveError(null);

    const entryId = `entry_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const newEntry: JournalEntry = {
      id: entryId,
      userId: currentUser.uid,
      title: finalSummary.title,
      summary: finalSummary.summary,
      keyInsights: finalSummary.keyInsights || [],
      mood: finalSummary.mood || "Reflective",
      tags: finalSummary.tags || [],
      actionItems: finalSummary.actionItems || [],
      messageCount: messages.length,
      messages: [...messages],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await saveJournalEntry(currentUser.uid, newEntry);

    if (result.success) {
      setIsSavingToFirestore(false);
      setIsSummaryModalOpen(false);
      // Prepend entry to local list
      setJournals((prev) => [newEntry, ...prev.filter((e) => e.id !== entryId)]);
      showToast(`Journal entry "${finalSummary.title}" saved to Cloud Firestore under /users/${currentUser.uid.slice(0, 6)}.../journals/${entryId}`, "success");
    } else {
      setIsSavingToFirestore(false);
      setSaveError(result.error || "Could not write to Cloud Firestore.");
      // Do NOT close modal or clear state on error, allowing retry
    }
  };

  // Start fresh journaling session
  const handleNewSession = () => {
    if (messages.length > 0) {
      const confirmReset = window.confirm(
        "Start a new conversation session? Any unsaved thoughts in this conversation will be cleared."
      );
      if (!confirmReset) return;
    }
    setMessages([]);
    setChatError(null);
    setActiveSummary(null);
    showToast("Started a new journaling session.", "info");
  };

  // Delete journal entry
  const handleDeleteEntry = async (entryId: string) => {
    if (!currentUser) return;
    const result = await removeJournalEntry(currentUser.uid, entryId);
    if (result.success) {
      setJournals((prev) => prev.filter((e) => e.id !== entryId));
      showToast("Journal entry removed from Firestore.", "info");
    } else {
      showToast(result.error || "Failed to delete entry.", "error");
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans text-stone-900">
      {/* Top Application Header */}
      <Header
        user={currentUser}
        journalCount={journals.length}
        habitCount={habits.length}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenAuth={() => {
          setAuthRequiredNotice(null);
          setIsAuthModalOpen(true);
        }}
        onSignOut={async () => {
          await logOut();
          showToast("Signed out successfully.", "info");
        }}
        onNewSession={handleNewSession}
        onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
        isHistoryOpen={isHistoryOpen}
      />

      {/* Main Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-3 sm:p-6 flex flex-col">
        {/* Unauthenticated Security Banner */}
        {!currentUser && (
          <div
            id="auth-callout-banner"
            className="mb-4 p-4 bg-amber-50/80 border border-amber-200/90 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-900 shadow-2xs"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-amber-200/70 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4 h-4 text-amber-900" />
              </div>
              <div>
                <span className="font-bold text-stone-900 block text-xs sm:text-sm">
                  Sign in with Firebase to unlock persistent cloud journaling & habits
                </span>
                <span className="text-amber-800 text-[11px]">
                  Entries & habits are scoped strictly to /users/{"{uid}"}/journals and /users/{"{uid}"}/habits with zero insecure defaults.
                </span>
              </div>
            </div>
            <button
              id="banner-signin-btn"
              onClick={() => {
                setAuthRequiredNotice("Sign in to link and persist your journals and habits in Cloud Firestore.");
                setIsAuthModalOpen(true);
              }}
              className="px-3.5 py-1.5 bg-stone-900 hover:bg-stone-800 text-amber-300 font-semibold rounded-xl text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Sign In / Register
            </button>
          </div>
        )}

        {/* Dynamic Workspace: Journal vs Habits */}
        <div className="flex-1 min-h-[560px]">
          {activeTab === "journal" ? (
            <ChatInterface
              messages={messages}
              isThinking={isThinking}
              onSendMessage={handleSendMessage}
              onSummarizeAndSave={handleSummarizeSession}
              isSummarizing={isSummarizing}
              hasUnsavedSummary={!!activeSummary}
              activeError={chatError}
              onRetryLastMessage={handleRetryLastMessage}
            />
          ) : (
            <HabitTracker
              habits={habits}
              onAddHabit={(name, cat, freq) => handleAddHabit(name, cat, freq, "manual")}
              onToggleDay={handleToggleHabitDay}
              onDeleteHabit={handleDeleteHabit}
              suggestedHabits={pendingHabitSuggestions}
              onAcceptSuggestion={handleAcceptHabitSuggestion}
              onDismissSuggestion={handleDismissHabitSuggestion}
              isLoading={isLoadingHabits}
              userUid={currentUser?.uid}
            />
          )}
        </div>
      </main>

      {/* Floating Toast Notification */}
      {toast && (
        <div
          id="app-toast-notification"
          className="fixed bottom-5 right-5 z-50 flex items-center space-x-2.5 px-4 py-3 bg-stone-900 text-white rounded-xl shadow-xl text-xs max-w-md animate-in slide-in-from-bottom-2 duration-200"
        >
          {toast.type === "success" && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
          {toast.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
          {toast.type === "info" && <Info className="w-4 h-4 text-amber-400 shrink-0" />}
          <span className="flex-1 leading-relaxed">{toast.text}</span>
        </div>
      )}

      {/* Firebase Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setAuthRequiredNotice(null);
        }}
        onSuccess={() => {
          showToast("Authentication successful! Welcome to your journal.", "success");
        }}
      />

      {/* Session Reflection & Summary Review Modal */}
      <SessionSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        summary={activeSummary}
        onConfirmSave={handleConfirmSaveToFirestore}
        isSaving={isSavingToFirestore}
        saveError={saveError}
        onRetrySave={() => {
          if (activeSummary) {
            handleConfirmSaveToFirestore(activeSummary);
          }
        }}
        onTrackSuggestedHabit={handleTrackSuggestedHabitFromModal}
      />

      {/* Past Journals History Drawer */}
      <JournalHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        entries={journals}
        onDeleteEntry={handleDeleteEntry}
        isLoading={isLoadingJournals}
      />
    </div>
  );
}

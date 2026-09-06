import React from "react";
import { BookOpen, Sparkles, LogIn, LogOut, PlusCircle, History, ShieldCheck, Flame } from "lucide-react";
import { User } from "firebase/auth";

interface HeaderProps {
  user: User | null;
  journalCount: number;
  habitCount: number;
  activeTab: "journal" | "habits";
  onTabChange: (tab: "journal" | "habits") => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onNewSession: () => void;
  onToggleHistory: () => void;
  isHistoryOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  journalCount,
  habitCount,
  activeTab,
  onTabChange,
  onOpenAuth,
  onSignOut,
  onNewSession,
  onToggleHistory,
  isHistoryOpen,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-30 w-full bg-white/95 backdrop-blur-md border-b border-stone-200"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Brand identity */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-stone-900 text-amber-200 flex items-center justify-center shadow-sm">
            <BookOpen className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base sm:text-lg font-bold text-stone-900 tracking-tight font-serif">
                Personal Gemini Journal
              </h1>
              <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                <Sparkles className="w-3 h-3 mr-1 text-amber-600" />
                Gemini Multi-Turn
              </span>
            </div>
            <div className="hidden sm:flex items-center text-[11px] text-stone-500 space-x-1.5">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>GCP Secret Manager &bull; Scoped /users/{user?.uid ? user.uid.slice(0, 6) + "..." : "uid"}</span>
            </div>
          </div>
        </div>

        {/* Main Navigation Tabs */}
        <nav
          id="main-nav-tabs"
          className="flex items-center p-1 bg-stone-100 rounded-xl border border-stone-200"
        >
          <button
            id="nav-tab-journal"
            onClick={() => onTabChange("journal")}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "journal"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Journal</span>
          </button>
          <button
            id="nav-tab-habits"
            onClick={() => onTabChange("habits")}
            className={`flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === "habits"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                activeTab === "habits" ? "text-amber-500 fill-amber-500" : "text-stone-400"
              }`}
            />
            <span>Habits</span>
            {habitCount > 0 && (
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                  activeTab === "habits"
                    ? "bg-amber-100 text-amber-900"
                    : "bg-stone-200 text-stone-600"
                }`}
              >
                {habitCount}
              </span>
            )}
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 shrink-0">
          {/* New Session Button (shown when in Journal view) */}
          {activeTab === "journal" && (
            <button
              id="header-new-session-btn"
              onClick={onNewSession}
              title="Start fresh journaling session"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-stone-600" />
              <span>New Session</span>
            </button>
          )}

          {/* Past Journals Toggle */}
          <button
            id="header-history-btn"
            onClick={onToggleHistory}
            title="View past journal reflections"
            className={`flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
              isHistoryOpen
                ? "bg-stone-900 text-white"
                : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden md:inline">Past Journals</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                isHistoryOpen
                  ? "bg-stone-700 text-amber-200"
                  : "bg-stone-200 text-stone-700"
              }`}
            >
              {journalCount}
            </span>
          </button>

          {/* Auth State Button */}
          {user ? (
            <div className="flex items-center space-x-2 pl-1 border-l border-stone-200">
              <div
                id="header-user-badge"
                title={user.email || user.uid}
                className="hidden md:flex items-center space-x-1.5 text-xs text-stone-700 bg-stone-50 border border-stone-200 px-2.5 py-1 rounded-lg max-w-[170px]"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="truncate">{user.displayName || user.email?.split("@")[0] || "Authenticated"}</span>
              </div>
              <button
                id="header-signout-btn"
                onClick={onSignOut}
                title="Sign out of Firebase"
                className="p-1.5 text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="header-signin-btn"
              onClick={onOpenAuth}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-stone-900 hover:bg-stone-800 rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-4 h-4 text-amber-300" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

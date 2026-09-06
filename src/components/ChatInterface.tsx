import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Sparkles,
  Bot,
  User as UserIcon,
  Compass,
  Lightbulb,
  CloudRain,
  Smile,
  RefreshCw,
  FileCheck2,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { ChatMessage, ReflectionPrompt } from "../lib/types";
import { REFLECTION_PROMPTS } from "../lib/prompts";

interface ChatInterfaceProps {
  messages: ChatMessage[];
  isThinking: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onSummarizeAndSave: () => Promise<void>;
  isSummarizing: boolean;
  hasUnsavedSummary: boolean;
  activeError: string | null;
  onRetryLastMessage?: () => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  isThinking,
  onSendMessage,
  onSummarizeAndSave,
  isSummarizing,
  hasUnsavedSummary,
  activeError,
  onRetryLastMessage,
}) => {
  const [inputText, setInputText] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  // Adjust textarea height dynamically
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed || isThinking || isSummarizing) return;
    setInputText("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSendMessage(trimmed);
  };

  const handleSelectPrompt = (prompt: ReflectionPrompt) => {
    setInputText(prompt.prompt);
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
        }
      }, 50);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const renderPromptIcon = (iconName: string) => {
    switch (iconName) {
      case "Compass":
        return <Compass className="w-3.5 h-3.5 text-amber-600" />;
      case "CloudRain":
        return <CloudRain className="w-3.5 h-3.5 text-blue-600" />;
      case "Lightbulb":
        return <Lightbulb className="w-3.5 h-3.5 text-amber-500" />;
      case "Smile":
        return <Smile className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
    }
  };

  return (
    <div
      id="chat-interface-container"
      className="flex flex-col h-full bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden"
    >
      {/* Top Session Toolbar */}
      <div
        id="chat-toolbar"
        className="px-5 py-3 bg-stone-50 border-b border-stone-200 flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-stone-700 tracking-wide">
            Reflective Dialogue & Brainstorming
          </span>
          <span className="text-[11px] text-stone-400">
            ({messages.length} {messages.length === 1 ? "turn" : "turns"})
          </span>
        </div>

        {/* Action button to finish and generate summary */}
        {messages.length >= 2 && (
          <button
            id="chat-summarize-session-btn"
            onClick={onSummarizeAndSave}
            disabled={isSummarizing || isThinking}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-50 text-amber-300 text-xs font-medium rounded-lg transition-all shadow-xs cursor-pointer"
          >
            {isSummarizing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Summarizing & Saving...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-3.5 h-3.5 text-amber-300" />
                <span>Save & Summarize Entry</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Message List */}
      <div
        id="chat-messages-scroll-area"
        className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-stone-50/50"
      >
        {messages.length === 0 ? (
          <div
            id="chat-empty-state"
            className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto py-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-100/70 text-amber-700 flex items-center justify-center mb-4 shadow-xs">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1.5 font-serif">
              What is on your mind today?
            </h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Have a natural multi-turn conversation with Gemini to explore decisions, untangle
              stress, brainstorm new ideas, or reflect on your day. When ready, click &ldquo;Save &amp;
              Summarize&rdquo; to archive your entry to Cloud Firestore.
            </p>

            {/* Reflection Starter Chips */}
            <div className="w-full space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-2">
                Starter Prompts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {REFLECTION_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.id}
                    id={`prompt-chip-${prompt.id}`}
                    onClick={() => handleSelectPrompt(prompt)}
                    className="p-3 bg-white hover:bg-stone-100/80 border border-stone-200/90 rounded-xl text-left transition-all hover:border-stone-300 shadow-2xs group cursor-pointer"
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {renderPromptIcon(prompt.icon)}
                      <span className="text-xs font-semibold text-stone-800 group-hover:text-stone-900">
                        {prompt.title}
                      </span>
                    </div>
                    <p className="text-[11px] text-stone-500 line-clamp-2 leading-tight">
                      {prompt.prompt}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              id={`chat-message-${msg.id}`}
              className={`flex items-start space-x-3 group ${
                msg.role === "user" ? "flex-row-reverse space-x-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
                  msg.role === "user"
                    ? "bg-stone-900 text-white"
                    : "bg-white border border-stone-200 text-amber-600"
                }`}
              >
                {msg.role === "user" ? (
                  <UserIcon className="w-4 h-4 text-stone-200" />
                ) : (
                  <Bot className="w-4 h-4 text-amber-600" />
                )}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-sm leading-relaxed relative ${
                  msg.role === "user"
                    ? "bg-stone-900 text-stone-100 rounded-tr-xs"
                    : "bg-white border border-stone-200 text-stone-800 rounded-tl-xs shadow-2xs"
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

                {/* Message footer info */}
                <div
                  className={`mt-2 pt-1 border-t flex items-center justify-between text-[10px] ${
                    msg.role === "user"
                      ? "border-stone-800 text-stone-400"
                      : "border-stone-100 text-stone-400"
                  }`}
                >
                  <span>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>

                  <div className="flex items-center space-x-2">
                    {msg.modelUsed && (
                      <span className="text-[9px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded font-mono">
                        {msg.modelUsed}
                      </span>
                    )}
                    <button
                      onClick={() => handleCopyMessage(msg.id, msg.content)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:text-stone-700 cursor-pointer"
                      title="Copy message text"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {/* Gemini Thinking Indicator */}
        {isThinking && (
          <div
            id="chat-thinking-indicator"
            className="flex items-start space-x-3 animate-in fade-in"
          >
            <div className="w-8 h-8 rounded-xl bg-white border border-stone-200 text-amber-600 flex items-center justify-center shrink-0 shadow-xs">
              <Bot className="w-4 h-4 text-amber-600 animate-pulse" />
            </div>
            <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 shadow-2xs">
              <div className="flex items-center space-x-2 text-xs text-stone-500">
                <span className="flex space-x-1">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                </span>
                <span>Gemini is reflecting...</span>
              </div>
            </div>
          </div>
        )}

        {/* Active Error Notice with Retry */}
        {activeError && (
          <div
            id="chat-error-alert"
            className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{activeError}</span>
            </div>
            {onRetryLastMessage && (
              <button
                id="chat-retry-btn"
                onClick={onRetryLastMessage}
                className="ml-3 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-800 font-medium rounded-lg text-xs flex items-center space-x-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div id="chat-input-area" className="p-3 sm:p-4 bg-white border-t border-stone-200">
        <div className="relative flex items-end bg-stone-50 border border-stone-200 focus-within:border-stone-900 focus-within:bg-white rounded-2xl p-2 transition-all shadow-2xs">
          <textarea
            ref={textareaRef}
            id="chat-input-textarea"
            rows={1}
            value={inputText}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your reflection, question, or thought... (Shift+Enter for newline)"
            className="flex-1 max-h-44 p-2 bg-transparent text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none resize-none font-sans"
            disabled={isThinking || isSummarizing}
          />

          <div className="flex items-center space-x-1 pl-2">
            <button
              id="chat-send-btn"
              onClick={handleSend}
              disabled={!inputText.trim() || isThinking || isSummarizing}
              className="p-2.5 bg-stone-900 hover:bg-stone-800 disabled:opacity-30 text-amber-200 rounded-xl transition-all shadow-xs cursor-pointer"
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-stone-400">
          <span>Shift + Enter for new line</span>
          <span className="flex items-center space-x-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            <span>Multi-turn Gemini Reflexive Engine</span>
          </span>
        </div>
      </div>
    </div>
  );
};

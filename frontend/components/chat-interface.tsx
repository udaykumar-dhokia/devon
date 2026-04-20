"use client";

import * as React from "react";
import {
  Send,
  User,
  Bot,
  Loader2,
  Wrench,
  Lightbulb,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DevonAPI } from "@/lib/api";

interface Message {
  role: "user" | "assistant" | "system";
  text?: string;
  id: string;
  isLog?: boolean;
  event?: {
    type:
      | "log"
      | "thought"
      | "tool_call"
      | "tool_result"
      | "phase"
      | "status"
      | "feedback_request";
    content: any;
    result?: any;
    timestamp?: number;
  };
}

const SLASH_COMMANDS = [
  { command: "/issues", description: "List open issues for current repo" },
  { command: "/plan", description: "Create implementation plan" },
  { command: "/code", description: "Execute plan & write code" },
  { command: "/list", description: "List your GitHub repositories" },
  { command: "/repos", description: "List cloned local repositories" },
  { command: "/use", description: "Switch current repository context" },
  { command: "/unuse", description: "Clear current repository selection" },
  { command: "/clone", description: "Clone a repo from GitHub" },
  { command: "/delete", description: "Delete a local repository" },
  { command: "/provider", description: "Show current LLM provider" },
  { command: "/model", description: "View or change current LLM model" },
  { command: "/models", description: "List available LLM models" },
  { command: "/help", description: "Show detailed command help" },
];

function FeedbackRenderer({ data }: { data: any }) {
  if (!data) return null;

  const { question, tasks, plan, task } = data;

  return (
    <div className="space-y-6 my-6 p-8 border-2 bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/40 dark:to-zinc-950 border-primary/10 shadow-xl relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />

      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 bg-primary/10 rounded-full">
          <Lightbulb className="w-5 h-5 text-primary" />
        </div>
        <h3 className="font-black text-[13px] uppercase tracking-[0.2em] text-foreground/80">
          {question || "Decision Required"}
        </h3>
      </div>

      {tasks && (
        <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm overflow-hidden">
          <table className="w-full text-left text-[12px] border-collapse">
            <thead>
              <tr className="border-b bg-zinc-50/50 dark:bg-zinc-900/50 text-muted-foreground">
                <th className="px-5 py-4 font-black uppercase tracking-widest w-16 text-center">
                  ID
                </th>
                <th className="px-5 py-4 font-black uppercase tracking-widest">
                  Planned Task
                </th>
                <th className="px-5 py-4 font-black uppercase tracking-widest w-32 text-center">
                  Progress
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
              {tasks.map((t: any) => (
                <tr
                  key={t.id}
                  className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/20 transition-all duration-200"
                >
                  <td className="px-5 py-4 text-center font-mono font-black text-primary/40 text-[14px]">
                    {t.id}
                  </td>
                  <td className="px-5 py-5">
                    <div className="font-bold text-sm mb-1 text-foreground/90">
                      {t.title}
                    </div>
                    <div className="text-muted-foreground/70 text-[12px] leading-relaxed max-w-xl">
                      {t.description}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-center">
                    <span
                      className={cn(
                        "px-3 py-1 text-[10px] font-black uppercase tracking-widest border rounded-full inline-block min-w-[90px]",
                        t.status === "done"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : t.status === "in_progress"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20 animate-pulse"
                            : "bg-zinc-500/5 text-zinc-400 border-zinc-500/10",
                      )}
                    >
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {task && (
        <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-sm">
          <h4 className="font-black text-sm uppercase tracking-wider mb-2 text-primary">
            Focused Task: {task.id}
          </h4>
          <div className="font-bold text-lg mb-2">{task.title}</div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {task.description}
          </p>
        </div>
      )}

      {plan && (
        <div className="space-y-3">
          <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Proposed Implementation Plan
          </div>
          <div className="p-6 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-inner max-h-[400px] overflow-y-auto scrollbar-thin">
            <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-zinc-700 dark:text-zinc-300">
              {plan}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

function LogRenderer({ event }: { event: NonNullable<Message["event"]> }) {
  const { type, content, result } = event;

  switch (type) {
    case "phase":
      return (
        <div className="w-full flex items-center gap-4 py-6">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[10px] uppercase tracking-[0.4em] font-black text-primary/70 whitespace-nowrap px-4 py-1.5 border border-primary/10 bg-primary/5 rounded-full shadow-sm">
            {content}
          </span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
      );
    case "thought":
      return (
        <div className="flex gap-4 bg-zinc-50 dark:bg-zinc-900/50 p-5 border-l-4 border-amber-500/50 my-4 shadow-sm hover:border-amber-500 transition-all">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="italic text-zinc-700 dark:text-zinc-300 text-[14px] leading-relaxed">
            {content}
          </p>
        </div>
      );
    case "tool_call":
      return (
        <Accordion type="single" collapsible className="w-full my-4">
          <AccordionItem
            value="tool"
            className="border shadow-md bg-white dark:bg-zinc-950 overflow-hidden rounded-none"
          >
            <AccordionTrigger className="hover:no-underline py-4 px-5 bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-4 w-full">
                <div className="p-2 bg-primary/10 rounded-none border border-primary/20">
                  <Wrench className="w-4 h-4 text-primary" />
                </div>
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-mono text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
                    Tool Execution
                  </span>
                  <span className="font-mono text-[14px] font-bold text-primary">
                    {content.name}
                  </span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-6 pt-0 pb-6 px-5 border-t">
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.1em]">
                  <ChevronRight className="w-3 h-3 text-primary" /> Input
                  Arguments
                </div>
                <pre className="text-[12px] font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto p-4 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-none shadow-inner">
                  {JSON.stringify(content.args, null, 2)}
                </pre>
              </div>

              {result && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black text-muted-foreground/80 uppercase tracking-[0.1em]">
                    <Terminal className="w-3 h-3 text-primary" /> Output Result
                  </div>
                  <pre className="text-[12px] font-mono text-zinc-500 dark:text-zinc-500 max-h-[500px] overflow-y-auto overflow-x-auto p-4 bg-zinc-100/50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800 rounded-none">
                    {result}
                  </pre>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      );
    case "status":
      return (
        <div className="flex items-center gap-3 text-muted-foreground/80 py-4 px-2 my-2 border-y border-zinc-100 dark:border-zinc-800/50 animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-[13px] font-bold tracking-tight uppercase italic">
            {content}
          </span>
        </div>
      );
    case "feedback_request":
      return <FeedbackRenderer data={content} />;
    default:
      return (
        <div className="font-mono text-[13px] text-zinc-700 dark:text-zinc-300 opacity-80 whitespace-pre-wrap py-2 leading-relaxed pl-1">
          {content}
        </div>
      );
  }
}

function MessageRenderer({
  msg,
  isFirstInGroup,
}: {
  msg: Message;
  isFirstInGroup: boolean;
}) {
  if (msg.event?.type === "phase") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full"
      >
        <LogRenderer event={msg.event} />
      </motion.div>
    );
  }

  // Skip rendering tool_results that have been mated with their calls
  if (msg.event?.type === "tool_result" && msg.id.startsWith("mated-")) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "flex gap-3 text-sm leading-relaxed",
        msg.role === "user" ? "flex-row-reverse mb-6" : "flex-row mb-1",
        !isFirstInGroup && msg.role === "assistant" && "pl-11",
      )}
    >
      {isFirstInGroup || msg.role === "user" ? (
        <div
          className={cn(
            "w-8 h-8 rounded-none flex items-center justify-center shrink-0 border shadow-sm",
            msg.role === "assistant"
              ? "bg-primary text-primary-foreground"
              : "bg-zinc-100 dark:bg-zinc-800",
          )}
        >
          {msg.role === "assistant" ? (
            <Bot className="w-4 h-4" />
          ) : (
            <User className="w-4 h-4" />
          )}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      <div
        className={cn(
          "rounded-none max-w-[90%] font-sans",
          msg.role === "user"
            ? "bg-primary text-primary-foreground px-4 py-2.5 shadow-sm"
            : "text-foreground min-w-0 flex-1",
        )}
      >
        {msg.isLog && msg.event ? (
          <LogRenderer event={msg.event} />
        ) : (
          <div
            className={cn(
              "bg-zinc-100 dark:bg-zinc-900 border rounded-none px-4 py-2.5 shadow-sm",
              msg.role === "user" &&
                "bg-transparent border-none shadow-none p-0",
            )}
          >
            {msg.text}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function ChatInterface({
  projectName,
  config,
  onConfigUpdate,
  onProjectChange,
}: {
  projectName: string;
  config: any;
  onConfigUpdate: (newConfig: any) => void;
  onProjectChange: (name: string) => void;
}) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      text: `Hello! I'm ready to help you with ${projectName}. What should we work on today?`,
      id: "initial",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [models, setModels] = React.useState<any[]>([]);
  const [loadingModels, setLoadingModels] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [filteredCommands, setFilteredCommands] =
    React.useState(SLASH_COMMANDS);
  const [suggestionIndex, setSuggestionIndex] = React.useState(0);
  const [agentStatus, setAgentStatus] = React.useState<
    "idle" | "running" | "waiting"
  >("idle");
  const [currentJob, setCurrentJob] = React.useState<{
    repo: string;
    issue?: number;
  } | null>(null);
  const [feedbackInput, setFeedbackInput] = React.useState("");

  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector(
        "[data-radix-scroll-area-viewport]",
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, agentStatus]);

  React.useEffect(() => {
    async function loadModels() {
      if (!config?.llm_base_url) return;
      setLoadingModels(true);
      try {
        const result = await (window as any).electronAPI.fetchModels(
          config.llm_base_url,
        );
        if (result.success) {
          setModels(result.models);
        }
      } catch (error) {
        console.error("ChatInterface: Failed to fetch models", error);
      } finally {
        setLoadingModels(false);
      }
    }
    loadModels();
  }, [config?.llm_base_url]);

  React.useEffect(() => {
    if (agentStatus !== "running" || !currentJob) return;

    const pollLogs = async () => {
      try {
        const { logs } = await DevonAPI.getAgentLogs(
          currentJob.repo,
          currentJob.issue || 0,
        );
        if (logs && logs.length > 0) {
          setMessages((prev) => {
            let nextMessages = [...prev];
            logs.forEach((event: any, i: number) => {
              // Unified Tool Mating Logic
              if (event.type === "tool_result") {
                // Find the latest incomplete tool_call
                const lastCallIdx = [...nextMessages]
                  .reverse()
                  .findIndex(
                    (m) =>
                      m.isLog &&
                      m.role === "assistant" &&
                      m.event?.type === "tool_call" &&
                      !m.event.result,
                  );

                if (lastCallIdx !== -1) {
                  const actualIdx = nextMessages.length - 1 - lastCallIdx;
                  nextMessages[actualIdx] = {
                    ...nextMessages[actualIdx],
                    event: {
                      ...nextMessages[actualIdx].event!,
                      result: event.content,
                    },
                  };
                  // Add a hidden mated marker to tool_result to ensure it's not rendered separately
                  nextMessages.push({
                    role: "assistant",
                    id: `mated-result-${Date.now()}-${i}`,
                    isLog: true,
                    event: event,
                  });
                  return;
                }
              }

              nextMessages.push({
                role: "assistant",
                id: `log-${Date.now()}-${i}`,
                isLog: true,
                event: event,
              });
            });
            return nextMessages;
          });

          if (
            logs.some(
              (l: any) =>
                l.type === "status" &&
                (l.content.includes("Waiting for user feedback") ||
                  l.content.includes("Any changes to")),
            )
          ) {
            setAgentStatus("waiting");
          }
        }
      } catch (e) {
        console.error("Failed to poll logs", e);
      }
    };

    const interval = setInterval(pollLogs, 1500);
    return () => clearInterval(interval);
  }, [agentStatus, currentJob]);

  React.useEffect(() => {
    if (input.startsWith("/")) {
      const query = input.toLowerCase();
      const filtered = SLASH_COMMANDS.filter((c) =>
        c.command.toLowerCase().startsWith(query),
      );
      setFilteredCommands(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
    setSuggestionIndex(0);
  }, [input]);

  const handleModelChange = async (newModelName: string) => {
    const newConfig = { ...config, llm_model_name: newModelName };
    try {
      const result = await (window as any).electronAPI.saveConfig(newConfig);
      if (result.success) {
        onConfigUpdate(newConfig);
      }
    } catch (error) {
      console.error("ChatInterface: Failed to save config", error);
    }
  };

  const handleSend = async (textOverride?: string) => {
    const text = textOverride || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      role: "user",
      text,
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    if (text.startsWith("/")) {
      try {
        const parts = text.split(" ");
        const cmd = parts[0].toLowerCase();

        if (cmd === "/use" && parts[1]) {
          onProjectChange(parts[1]);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: `Switched to ${parts[1]}`,
              id: Date.now().toString(),
            },
          ]);
          setSending(false);
          return;
        }

        if (cmd === "/unuse" || cmd === "/unselect") {
          onProjectChange("");
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: "Stopped using the current repository.",
              id: Date.now().toString(),
            },
          ]);
          setSending(false);
          return;
        }

        const result = await DevonAPI.executeCommand(projectName, text);
        if (result.status === "started") {
          setAgentStatus("running");
          const issueNum = parts[1] ? parseInt(parts[1]) : undefined;
          setCurrentJob({ repo: projectName, issue: issueNum });
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: result.message || "Command executed",
              id: Date.now().toString(),
            },
          ]);
          setSending(false);
        }
      } catch (e: any) {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            text: `Error: ${e.message}`,
            id: Date.now().toString(),
          },
        ]);
        setSending(false);
      }
    } else {
      setTimeout(() => {
        const botMessage: Message = {
          role: "assistant",
          text: `I've acknowledged your request for ${projectName}. I'm currently analyzing the repository structure to determine the best approach.`,
          id: (Date.now() + 1).toString(),
        };
        setMessages((prev) => [...prev, botMessage]);
        setSending(false);
      }, 1500);
    }
  };

  const handleFeedback = async (feedback: string) => {
    if (!currentJob?.repo) return;
    setAgentStatus("running");
    setFeedbackInput("");
    try {
      await DevonAPI.provideFeedback(
        currentJob.repo,
        currentJob.issue || 0,
        feedback,
      );
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          text: feedback || "Approved",
          id: Date.now().toString(),
        },
      ]);
    } catch (e) {
      console.error(e);
      setAgentStatus("waiting");
    }
  };

  const selectSuggestion = (cmd: string) => {
    setInput(cmd + " ");
    setShowSuggestions(false);
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-white dark:bg-zinc-950 relative">
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <ScrollArea ref={scrollRef} className="h-full w-full">
          <div className="p-4 space-y-6 max-w-3xl mx-auto">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const prevMsg = messages[idx - 1];
                // Group messages from the same role, but break on phases or role changes
                const isFirstInGroup =
                  !prevMsg ||
                  prevMsg.role !== msg.role ||
                  msg.event?.type === "phase" ||
                  prevMsg.event?.type === "phase";

                return (
                  <MessageRenderer
                    key={msg.id}
                    msg={msg}
                    isFirstInGroup={isFirstInGroup}
                  />
                );
              })}
            </AnimatePresence>
            {sending && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-none flex items-center justify-center shrink-0 border bg-primary text-primary-foreground shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-zinc-100 dark:bg-zinc-900 border rounded-none px-4 py-2.5 flex items-center shadow-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="shrink-0 p-4 border-t bg-white dark:bg-zinc-950 relative z-20">
        <div className="max-w-3xl mx-auto relative">
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl overflow-hidden z-50 rounded-none w-full mx-auto"
              >
                {filteredCommands.map((cmd, idx) => (
                  <button
                    key={cmd.command}
                    onClick={() => selectSuggestion(cmd.command)}
                    className={cn(
                      "w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left",
                      idx === suggestionIndex && "bg-zinc-50 dark:bg-zinc-800",
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-chart-2">
                        {cmd.command}
                      </span>
                      <span className="text-muted-foreground">
                        — {cmd.description}
                      </span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {agentStatus === "waiting" ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex-1 flex gap-2"
              >
                <Button
                  onClick={() => handleFeedback("")}
                  className="h-12 px-8 rounded-none font-bold bg-green-600 hover:bg-green-700 text-white"
                >
                  Yes, proceed
                </Button>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Or provide feedback..."
                    className="h-12 rounded-none bg-white dark:bg-zinc-950 border-primary"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleFeedback(feedbackInput)
                    }
                  />
                  <Button
                    onClick={() => handleFeedback(feedbackInput)}
                    variant="outline"
                    className="h-12 rounded-none"
                  >
                    Send Feedback
                  </Button>
                </div>
              </motion.div>
            ) : (
              <>
                <Select
                  value={config?.llm_model_name}
                  onValueChange={handleModelChange}
                  disabled={loadingModels || agentStatus === "running"}
                >
                  <SelectTrigger
                    size="default"
                    className="w-[180px] h-12 bg-white dark:bg-zinc-950 shadow-sm rounded-none border-input transition-all hover:border-primary shrink-0"
                  >
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-input shadow-xl">
                    {models.length > 0 ? (
                      models.map((m) => (
                        <SelectItem
                          key={m.name}
                          value={m.name}
                          className="rounded-none focus:bg-primary focus:text-primary-foreground"
                        >
                          {m.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem
                        value={config?.llm_model_name || "default"}
                        className="rounded-none"
                      >
                        {config?.llm_model_name || "Select Model"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <div className="relative flex-1 group">
                  <Input
                    placeholder={
                      agentStatus === "running"
                        ? "Agent is working..."
                        : `Message Devon...`
                    }
                    className={cn(
                      "pr-12 h-12 bg-white dark:bg-zinc-950 shadow-sm rounded-none border-input transition-all focus-visible:ring-1 focus-visible:ring-primary",
                      agentStatus === "running" &&
                        "opacity-50 pointer-events-none",
                    )}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (showSuggestions) {
                          e.preventDefault();
                          selectSuggestion(
                            filteredCommands[suggestionIndex].command,
                          );
                        } else {
                          handleSend();
                        }
                      }
                      if (e.key === "ArrowDown" && showSuggestions) {
                        e.preventDefault();
                        setSuggestionIndex(
                          (prev) => (prev + 1) % filteredCommands.length,
                        );
                      }
                      if (e.key === "ArrowUp" && showSuggestions) {
                        e.preventDefault();
                        setSuggestionIndex(
                          (prev) =>
                            (prev - 1 + filteredCommands.length) %
                            filteredCommands.length,
                        );
                      }
                      if (e.key === "Tab" && showSuggestions) {
                        e.preventDefault();
                        selectSuggestion(
                          filteredCommands[suggestionIndex].command,
                        );
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10 rounded-none bg-primary hover:bg-primary/90 transition-colors"
                    onClick={() => handleSend()}
                    disabled={
                      !input.trim() || sending || agentStatus === "running"
                    }
                  >
                    {agentStatus === "running" || sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

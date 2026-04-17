"use client";

import * as React from "react";
import { Send, User, Bot, Loader2, Wrench, Lightbulb, Terminal, ChevronRight } from "lucide-react";
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
    type: "log" | "thought" | "tool_call" | "tool_result" | "phase" | "status";
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

function LogRenderer({ event }: { event: NonNullable<Message["event"]> }) {
  const { type, content, result } = event;

  switch (type) {
    case "phase":
      return (
        <div className="w-full flex items-center gap-4 py-8">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-[10px] uppercase tracking-[0.3em] font-bold text-muted-foreground/60 whitespace-nowrap">
            {content}
          </span>
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>
      );
    case "thought":
      return (
        <div className="flex gap-3 bg-zinc-50 dark:bg-zinc-900/50 p-4 border-l-2 border-primary/30 my-2">
          <Lightbulb className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="italic text-zinc-600 dark:text-zinc-400 text-[13px]">{content}</p>
        </div>
      );
    case "tool_call":
      return (
        <Accordion type="single" collapsible className="w-full my-2">
          <AccordionItem value="tool" className="border shadow-sm bg-white dark:bg-zinc-950 px-3 py-0">
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 text-primary" />
                <div className="flex flex-col items-start gap-0.5">
                  <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tool Execution</span>
                  <span className="font-mono text-[13px] font-bold text-primary">{content.name}</span>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2 pb-4">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                  <ChevronRight className="w-3 h-3" /> Input Arguments
                </div>
                <pre className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 overflow-x-auto p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                  {JSON.stringify(content.args, null, 2)}
                </pre>
              </div>
              
              {result && (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                    <Terminal className="w-3 h-3" /> Output Result
                  </div>
                  <pre className="text-[11px] font-mono text-zinc-500 dark:text-zinc-500 max-h-80 overflow-y-auto overflow-x-auto p-3 bg-zinc-100/50 dark:bg-black/40 border border-zinc-200 dark:border-zinc-800">
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
        <div className="flex items-center gap-2 text-muted-foreground/70 py-2 border-y border-transparent">
          <Loader2 className="w-3 h-3 animate-spin text-primary" />
          <span className="text-[12px] font-medium italic">{content}</span>
        </div>
      );
    default:
      return <div className="font-mono text-[12px] opacity-70 whitespace-pre-wrap py-1 leading-relaxed">{content}</div>;
  }
}

function MessageRenderer({ msg, isFirstInGroup }: { msg: Message; isFirstInGroup: boolean }) {
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
        !isFirstInGroup && msg.role === "assistant" && "pl-11"
      )}
    >
      {isFirstInGroup || msg.role === "user" ? (
        <div className={cn(
          "w-8 h-8 rounded-none flex items-center justify-center shrink-0 border shadow-sm",
          msg.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-zinc-100 dark:bg-zinc-800"
        )}>
          {msg.role === "assistant" ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}
      
      <div className={cn(
        "rounded-none max-w-[90%] font-sans",
        msg.role === "user" 
          ? "bg-primary text-primary-foreground px-4 py-2.5 shadow-sm" 
          : "text-foreground min-w-0 flex-1"
      )}>
        {msg.isLog && msg.event ? (
          <LogRenderer event={msg.event} />
        ) : (
          <div className={cn(
            "bg-zinc-100 dark:bg-zinc-900 border rounded-none px-4 py-2.5 shadow-sm",
            msg.role === "user" && "bg-transparent border-none shadow-none p-0"
          )}>
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
  const [filteredCommands, setFilteredCommands] = React.useState(SLASH_COMMANDS);
  const [suggestionIndex, setSuggestionIndex] = React.useState(0);
  const [agentStatus, setAgentStatus] = React.useState<"idle" | "running" | "waiting">("idle");
  const [currentJob, setCurrentJob] = React.useState<{ repo: string; issue?: number } | null>(null);
  const [feedbackInput, setFeedbackInput] = React.useState("");

  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
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
        const result = await (window as any).electronAPI.fetchModels(config.llm_base_url);
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
        const { logs } = await DevonAPI.getAgentLogs(currentJob.repo, currentJob.issue || 0);
        if (logs && logs.length > 0) {
          setMessages((prev) => {
            let nextMessages = [...prev];
            logs.forEach((event: any, i: number) => {
              // Unified Tool Mating Logic
              if (event.type === "tool_result") {
                // Find the latest incomplete tool_call
                const lastCallIdx = [...nextMessages].reverse().findIndex(m => 
                  m.isLog && m.role === "assistant" && m.event?.type === "tool_call" && !m.event.result
                );
                
                if (lastCallIdx !== -1) {
                  const actualIdx = nextMessages.length - 1 - lastCallIdx;
                  nextMessages[actualIdx] = {
                    ...nextMessages[actualIdx],
                    event: { ...nextMessages[actualIdx].event!, result: event.content }
                  };
                  // Add a hidden mated marker to tool_result to ensure it's not rendered separately
                  nextMessages.push({
                    role: "assistant",
                    id: `mated-result-${Date.now()}-${i}`,
                    isLog: true,
                    event: event
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

          if (logs.some((l: any) => 
            l.type === "status" && (l.content.includes("Waiting for user feedback") || l.content.includes("Any changes to"))
          )) {
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
      const filtered = SLASH_COMMANDS.filter((c) => c.command.toLowerCase().startsWith(query));
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
           setMessages(prev => [...prev, { role: "assistant", text: `Switched to ${parts[1]}`, id: Date.now().toString() }]);
           setSending(false);
           return;
        }

        if (cmd === "/unuse" || cmd === "/unselect") {
           onProjectChange("");
           setMessages(prev => [...prev, { role: "assistant", text: "Stopped using the current repository.", id: Date.now().toString() }]);
           setSending(false);
           return;
        }

        const result = await DevonAPI.executeCommand(projectName, text);
        if (result.status === "started") {
          setAgentStatus("running");
          const issueNum = parts[1] ? parseInt(parts[1]) : undefined;
          setCurrentJob({ repo: projectName, issue: issueNum });
        } else {
          setMessages((prev) => [...prev, { role: "assistant", text: result.message || "Command executed", id: Date.now().toString() }]);
          setSending(false);
        }
      } catch (e: any) {
        setMessages((prev) => [...prev, { role: "assistant", text: `Error: ${e.message}`, id: Date.now().toString() }]);
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
    if (!currentJob?.issue) return;
    setAgentStatus("running");
    try {
      await DevonAPI.provideFeedback(currentJob.repo, currentJob.issue, feedback);
      setMessages((prev) => [...prev, { role: "user", text: feedback || "Approved", id: Date.now().toString() }]);
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
                const isFirstInGroup = !prevMsg || 
                                     prevMsg.role !== msg.role || 
                                     msg.event?.type === "phase" || 
                                     prevMsg.event?.type === "phase";
                
                return <MessageRenderer key={msg.id} msg={msg} isFirstInGroup={isFirstInGroup} />;
              })}
            </AnimatePresence>
            {sending && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
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
                    className={cn("w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left", idx === suggestionIndex && "bg-zinc-50 dark:bg-zinc-800")}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-mono font-bold text-chart-2">{cmd.command}</span>
                      <span className="text-muted-foreground">— {cmd.description}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-2">
            {agentStatus === "waiting" ? (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex gap-2">
                <Button onClick={() => handleFeedback("")} className="h-12 px-8 rounded-none font-bold bg-green-600 hover:bg-green-700 text-white">Yes, proceed</Button>
                <div className="flex-1 flex gap-2">
                  <Input
                    placeholder="Or provide feedback..."
                    className="h-12 rounded-none bg-white dark:bg-zinc-950 border-primary"
                    value={feedbackInput}
                    onChange={(e) => setFeedbackInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleFeedback(feedbackInput)}
                  />
                  <Button onClick={() => handleFeedback(feedbackInput)} variant="outline" className="h-12 rounded-none">Send Feedback</Button>
                </div>
              </motion.div>
            ) : (
              <>
                <Select value={config?.llm_model_name} onValueChange={handleModelChange} disabled={loadingModels || agentStatus === "running"}>
                  <SelectTrigger size="default" className="w-[180px] h-12 bg-white dark:bg-zinc-950 shadow-sm rounded-none border-input transition-all hover:border-primary shrink-0">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent className="rounded-none border-input shadow-xl">
                    {models.length > 0 ? (
                      models.map((m) => (
                        <SelectItem key={m.name} value={m.name} className="rounded-none focus:bg-primary focus:text-primary-foreground">{m.name}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value={config?.llm_model_name || "default"} className="rounded-none">{config?.llm_model_name || "Select Model"}</SelectItem>
                    )}
                  </SelectContent>
                </Select>

                <div className="relative flex-1 group">
                  <Input
                    placeholder={agentStatus === "running" ? "Agent is working..." : `Message Devon...`}
                    className={cn("pr-12 h-12 bg-white dark:bg-zinc-950 shadow-sm rounded-none border-input transition-all focus-visible:ring-1 focus-visible:ring-primary", agentStatus === "running" && "opacity-50 pointer-events-none")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (showSuggestions) {
                          e.preventDefault();
                          selectSuggestion(filteredCommands[suggestionIndex].command);
                        } else {
                          handleSend();
                        }
                      }
                      if (e.key === "ArrowDown" && showSuggestions) {
                        e.preventDefault();
                        setSuggestionIndex((prev) => (prev + 1) % filteredCommands.length);
                      }
                      if (e.key === "ArrowUp" && showSuggestions) {
                        e.preventDefault();
                        setSuggestionIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
                      }
                      if (e.key === "Tab" && showSuggestions) {
                        e.preventDefault();
                        selectSuggestion(filteredCommands[suggestionIndex].command);
                      }
                    }}
                  />
                  <Button
                    size="icon"
                    className="absolute right-1 top-1 h-10 w-10 rounded-none bg-primary hover:bg-primary/90 transition-colors"
                    onClick={() => handleSend()}
                    disabled={!input.trim() || sending || agentStatus === "running"}
                  >
                    {agentStatus === "running" || sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
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

"use client";

import * as React from "react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  role: "user" | "assistant";
  text: string;
  id: string;
}

export function ChatInterface({ projectName }: { projectName: string }) {
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      text: `Hello! I'm ready to help you with ${projectName}. What should we work on today?`,
      id: "initial",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: "user",
      text: input,
      id: Date.now().toString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSending(true);

    setTimeout(() => {
      const botMessage: Message = {
        role: "assistant",
        text: `I've acknowledged your request for ${projectName}. I'm currently analyzing the repository structure to determine the best approach.`,
        id: (Date.now() + 1).toString(),
      };
      setMessages((prev) => [...prev, botMessage]);
      setSending(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white dark:bg-zinc-950">
      <ScrollArea className="flex-1 p-4 no-scrollbar">
        <div className="space-y-6 max-w-3xl mx-auto">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, x: msg.role === "user" ? 10 : -10 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={cn(
                  "flex gap-3 text-sm leading-relaxed",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border shadow-sm",
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
                <div
                  className={cn(
                    "rounded-2xl px-4 py-2.5 max-w-[85%] shadow-sm",
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-tr-none"
                      : "bg-zinc-100 dark:bg-zinc-900 border text-foreground rounded-tl-none",
                  )}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {sending && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 border bg-primary text-primary-foreground shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900 border rounded-2xl rounded-tl-none px-4 py-2.5 flex items-center shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      <div className="p-4 ">
        <div className="max-w-3xl mx-auto relative">
          <Input
            placeholder={`Message Devon about ${projectName}...`}
            className="pr-12 py-6 bg-white dark:bg-zinc-950 shadow-sm"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button
            size="icon"
            className="absolute right-1.5 top-1.5"
            onClick={handleSend}
            disabled={!input.trim() || sending}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatInterface } from "@/components/chat-interface";
import { FileExplorer } from "@/components/file-explorer";
import { EditorView } from "@/components/editor-view";
import { DevonAPI } from "@/lib/api";
import { X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SidebarTrigger } from "./ui/sidebar";

interface Tab {
  id: string;
  title: string;
  type: "chat" | "editor";
  path?: string;
}

interface ProjectViewProps {
  projectName: string;
  config: any;
  onConfigUpdate: (newConfig: any) => void;
  onProjectChange: (name: string) => void;
}

export function ProjectView({
  projectName,
  config,
  onConfigUpdate,
  onProjectChange,
}: ProjectViewProps) {
  const [tree, setTree] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [tabs, setTabs] = React.useState<Tab[]>([
    { id: "chat", title: "Devon", type: "chat" },
  ]);
  const [activeTabId, setActiveTabId] = React.useState("chat");

  React.useEffect(() => {
    async function loadTree() {
      setLoading(true);
      try {
        const data = await DevonAPI.getRepoTree(projectName);
        setTree(data);
      } catch (error) {
        console.error("Failed to load project tree:", error);
      } finally {
        setLoading(false);
      }
    }
    loadTree();
  }, [projectName]);

  const openFile = (path: string) => {
    if (!path) return;
    const tabId = `editor-${path}`;
    if (!tabs.find((t) => t.id === tabId)) {
      const fileName = path.split("/").pop() || path;
      setTabs([...tabs, { id: tabId, title: fileName, type: "editor", path }]);
    }
    setActiveTabId(tabId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (id === "chat") return;
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      <header className="flex h-12 shrink-0 items-center justify-between px-6 border-b bg-background/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-2 overflow-hidden">
          <SidebarTrigger />
          <h1 className="text-xs font-semibold truncate tracking-wider opacity-80 uppercase">
            {projectName}
          </h1>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-hidden h-full">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          <ResizablePanel
            defaultSize={70}
            minSize={30}
            className="flex flex-col h-full overflow-hidden"
          >
            <div className="flex items-center gap-2 p-3 bg-zinc-50/10 dark:bg-zinc-950/20 overflow-x-auto no-scrollbar h-14 shrink-0">
              <AnimatePresence mode="popLayout">
                {tabs.map((tab) => (
                  <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.9, x: -10 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    key={tab.id}
                    onClick={() => setActiveTabId(tab.id)}
                    className={cn(
                      "group flex justify-between items-center h-8 px-4 gap-2 cursor-pointer transition-all relative min-w-[120px] max-w-[200px] rounded-none select-none",
                      activeTabId === tab.id
                        ? "bg-white dark:bg-zinc-800 text-foreground shadow-sm ring-1 ring-zinc-200 dark:ring-zinc-700"
                        : "text-muted-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 hover:text-foreground",
                    )}
                  >
                    <span className="text-xs font-semibold truncate flex-1 tracking-wide">
                      {tab.title}
                    </span>
                    {tab.id !== "chat" && (
                      <button
                        onClick={(e) => closeTab(e, tab.id)}
                        className="opacity-0 group-hover:opacity-100 p-0.5 rounded-none hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-opacity cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="flex-1 min-h-0 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTabId}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="h-full w-full"
                >
                  {tabs.find((t) => t.id === activeTabId)?.type === "chat" ? (
                    <ChatInterface
                      projectName={projectName}
                      config={config}
                      onConfigUpdate={onConfigUpdate}
                      onProjectChange={onProjectChange}
                    />
                  ) : (
                    <EditorView
                      repoName={projectName}
                      filePath={
                        tabs.find((t) => t.id === activeTabId)?.path || ""
                      }
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          <ResizablePanel
            defaultSize={30}
            minSize={20}
            className="flex flex-col h-full overflow-hidden bg-zinc-50/20 dark:bg-zinc-950/20"
          >
            <div className="flex flex-col h-full">
              <div className="h-10 py-6 px-6 flex items-center bg-white/40 dark:bg-zinc-950/40">
                <span className="text-[10px] font-bold text-muted-foreground/60">
                  File Explorer
                </span>
              </div>
              <ScrollArea className="flex-1 no-scrollbar">
                <FileExplorer
                  tree={tree}
                  loading={loading}
                  onFileDoubleClick={openFile}
                />
              </ScrollArea>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { DevonAPI } from "@/lib/api";
import { Loader2 } from "lucide-react";
import Editor from "@monaco-editor/react";
import { useTheme } from "next-themes";

interface EditorViewProps {
  repoName: string;
  filePath: string;
}

export function EditorView({ repoName, filePath }: EditorViewProps) {
  const [content, setContent] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { theme } = useTheme();

  const getLanguage = (path: string) => {
    const ext = path.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "js":
      case "cjs":
      case "mjs":
      case "jsx": return "javascript";
      case "ts":
      case "tsx": return "typescript";
      case "py": return "python";
      case "json": return "json";
      case "md": return "markdown";
      case "css": return "css";
      case "html": return "html";
      case "yaml":
      case "yml": return "yaml";
      case "sh": return "shell";
      default: return "plaintext";
    }
  };

  React.useEffect(() => {
    async function loadContent() {
      setLoading(true);
      setError(null);
      try {
        const text = await DevonAPI.getFileContent(repoName, filePath);
        setContent(text);
      } catch (err: any) {
        setError(err.message || "Failed to load file content.");
      } finally {
        setLoading(false);
      }
    }
    loadContent();
  }, [repoName, filePath]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-zinc-50 dark:bg-zinc-950/20">
        <Loader2 className="w-6 h-6 animate-spin mb-2" />
        <span className="text-xs">Loading {filePath}...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive italic p-8 text-center bg-zinc-50 dark:bg-zinc-950/20">
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 bg-white dark:bg-zinc-950">
        <Editor
          height="100%"
          language={getLanguage(filePath)}
          theme={theme === "dark" ? "vs-dark" : "light"}
          value={content || ""}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace",
            lineHeight: 1.6,
            padding: { top: 20 },
            scrollBeyondLastLine: false,
            wordWrap: "on",
            automaticLayout: true,
            scrollbar: {
              vertical: "visible",
              horizontal: "visible",
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
              useShadows: false
            }
          }}
        />
      </div>
    </div>
  );
}

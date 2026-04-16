"use client"

import * as React from "react"
import { ChevronDown, ChevronRight, File, Folder, FolderOpen } from "lucide-react"
import { cn } from "@/lib/utils"

interface FileTreeItem {
  name: string
  path: string
  type: "file" | "directory"
  children?: FileTreeItem[]
}

interface TreeItemProps {
  item: FileTreeItem
  depth: number
  onFileDoubleClick: (path: string) => void
}

function TreeItem({ item, depth, onFileDoubleClick }: TreeItemProps) {
  const [isOpen, setIsOpen] = React.useState(depth === 0)
  const isDirectory = item.type === "directory"

  return (
    <div className="select-none">
      <div
        className={cn(
          "flex items-center py-1 px-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer rounded-sm group",
          "text-sm transition-colors duration-200"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => isDirectory && setIsOpen(!isOpen)}
        onDoubleClick={() => !isDirectory && item.path && onFileDoubleClick(item.path)}
      >
        <span className="mr-1 text-muted-foreground w-4 h-4 flex items-center justify-center">
          {isDirectory ? (
            isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
          ) : null}
        </span>
        <span className="mr-2 text-primary/70">
          {isDirectory ? (
            isOpen ? <FolderOpen className="w-4 h-4 text-blue-400" /> : <Folder className="w-4 h-4 text-blue-400" />
          ) : (
            <File className="w-4 h-4 text-zinc-400" />
          )}
        </span>
        <span className="truncate group-hover:text-foreground">{item.name}</span>
      </div>
      {isDirectory && isOpen && item.children && (
        <div>
          {item.children.map((child, i) => (
            <TreeItem 
              key={`${child.name}-${i}`} 
              item={child} 
              depth={depth + 1} 
              onFileDoubleClick={onFileDoubleClick}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FileExplorer({ 
  tree, 
  loading,
  onFileDoubleClick 
}: { 
  tree: FileTreeItem | null, 
  loading: boolean,
  onFileDoubleClick: (path: string) => void
}) {
  if (loading) {
    return <div className="p-4 text-xs text-muted-foreground animate-pulse">Loading file structure...</div>
  }

  if (!tree) {
    return <div className="p-4 text-xs text-muted-foreground italic">No repository selected.</div>
  }

  return (
    <div className="py-2">
      {tree.children && tree.children.map((item, i) => (
        <TreeItem 
          key={`${item.name}-${i}`} 
          item={item} 
          depth={0} 
          onFileDoubleClick={onFileDoubleClick}
        />
      ))}
    </div>
  )
}

"use client";

import * as React from "react";
import { Box, ChevronRight, Command, Folder, Plus, Search } from "lucide-react";
import { motion } from "framer-motion";
import {
  useSidebar,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarInput,
} from "@/components/ui/sidebar";
import { DevonAPI } from "@/lib/api";
import { SettingsModal } from "@/components/settings";

export function AppSidebar({
  config,
  onConfigUpdate,
  selectedRepo,
  onSelectRepo,
  onReposLoaded,
  ...props
}: any) {
  const [repos, setRepos] = React.useState<any[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const { state } = useSidebar();

  React.useEffect(() => {
    async function loadRepos() {
      try {
        const data = await DevonAPI.listRepos();
        setRepos(data);
        if (data.length > 0 && !selectedRepo && onReposLoaded) {
          onReposLoaded(data);
        }
      } catch (error) {
        console.error("Sidebar: Failed to load repos", error);
      } finally {
        setLoading(false);
      }
    }
    loadRepos();
  }, []);

  const filteredRepos = repos.filter((repo) =>
    repo.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Sidebar variant="floating" collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <a href="#">
                <img src="./logo-white.svg" className="w-8 h-8" />
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-white">
                    Devon
                  </span>
                  <span className="truncate text-xs text-muted-foreground opacity-70">
                    GitHub Colleague
                  </span>
                </div>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Active Projects</SidebarGroupLabel>
          {state === "expanded" && (
            <div className="px-2 pb-2">
              <div className="relative mb-6">
                <Search className="absolute left-2 top-2.5 size-4 text-muted-foreground opacity-50" />
                <SidebarInput
                  placeholder="Search projects..."
                  className="pl-8"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          )}
          <SidebarGroupContent>
            <SidebarMenu>
              {loading ? (
                <div className="px-4 py-2 text-xs text-muted-foreground">
                  Loading repositories...
                </div>
              ) : filteredRepos.length > 0 ? (
                filteredRepos.map((repo, i) => (
                  <motion.div
                    key={repo.name}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="hover:-translate-y-0.5 transition-transform duration-200"
                  >
                    <SidebarMenuItem className="cursor-pointer">
                      <SidebarMenuButton
                        tooltip={repo.name}
                        isActive={selectedRepo === repo.name}
                        onClick={() => onSelectRepo(repo.name)}
                        className="cursor-pointer"
                      >
                        <Folder className="text-chart-2" />
                        <span className="font-medium">{repo.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </motion.div>
                ))
              ) : (
                <div className="px-4 py-2 text-xs text-muted-foreground italic">
                  No projects found.
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="grid flex-1 text-left text-sm leading-tight min-w-0">
                <span className="truncate font-medium">
                  {config.github_username || "User"}
                </span>
              </div>
            </div>
            <SettingsModal initialConfig={config} onUpdate={onConfigUpdate} />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

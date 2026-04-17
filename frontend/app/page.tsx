"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Onboarding } from "@/components/onboarding"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { ProjectView } from "@/components/project-view"

export default function Home() {
  const [config, setConfig] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  const [selectedRepo, setSelectedRepo] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function checkConfig() {
      try {
        const existingConfig = await window.electronAPI.getConfig()
        if (existingConfig) {
          setConfig(existingConfig)
        }
      } catch (error) {
        console.error("Failed to check configuration:", error)
      } finally {
        setLoading(false)
      }
    }
    checkConfig()
  }, [])

  const handleOnboardingComplete = (newConfig: any) => {
    setConfig(newConfig)
  }

  const handleUpdate = (newConfig: any) => {
    setConfig(newConfig)
  }

  const handleReposLoaded = (repos: any[]) => {
    if (repos.length > 0 && !selectedRepo) {
      setSelectedRepo(repos[0].name)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground animate-pulse">Checking configuration...</p>
      </div>
    )
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {!config ? (
          <motion.div
            key="onboarding"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1"
          >
            <Onboarding onComplete={handleOnboardingComplete} />
          </motion.div>
        ) : (
          <motion.div
            key="ide"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex h-full overflow-hidden"
          >
            <SidebarProvider defaultOpen={true}>
              <AppSidebar 
                config={config} 
                onConfigUpdate={handleUpdate}
                selectedRepo={selectedRepo}
                onSelectRepo={setSelectedRepo}
                onReposLoaded={handleReposLoaded}
              />
              <SidebarInset className="overflow-hidden h-full flex flex-col">
                {selectedRepo ? (
                  <div className="flex-1 min-h-0 h-full">
                    <ProjectView 
                      projectName={selectedRepo} 
                      config={config}
                      onConfigUpdate={handleUpdate}
                      onProjectChange={setSelectedRepo}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 opacity-20" />
                      <p>Initializing workspace...</p>
                    </div>
                  </div>
                )}
              </SidebarInset>
            </SidebarProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  )
}

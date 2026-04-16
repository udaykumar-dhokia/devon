"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  GitBranchPlus,
  Globe,
  Loader2,
  Server,
  Terminal,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface OnboardingProps {
  onComplete: (config: any) => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [fetchingModels, setFetchingModels] = React.useState(false);
  const [models, setModels] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState({
    github_username: "",
    github_token: "",
    llm_provider: "ollama",
    llm_base_url: "http://localhost:11434",
    llm_model_name: "llama3.1",
  });

  const fetchModels = async () => {
    setFetchingModels(true);
    setError(null);
    try {
      const result = await window.electronAPI.fetchModels(
        formData.llm_base_url,
      );
      if (result.success) {
        setModels(result.models!);
        if (
          result.models!.length > 0 &&
          !result.models!.some((m: any) => m.name === formData.llm_model_name)
        ) {
          setFormData((prev) => ({
            ...prev,
            llm_model_name: result.models![0].name,
          }));
        }
      } else {
        setError(result.error || "Failed to fetch models. Is Ollama running?");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await window.electronAPI.saveConfig(formData);
      if (result.success) {
        onComplete(formData);
      } else {
        setError(result.error || "Failed to save configuration.");
      }
    } catch (err) {
      setError("An unexpected error occurred while saving.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-[450px] shadow-lg border-2">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary rounded-md">
                    <GitBranchPlus className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Identity</CardTitle>
                </div>
                <CardDescription>
                  Configure your GitHub credentials to enable repository access.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">GitHub Username</Label>
                  <Input
                    id="username"
                    placeholder="Enter your username"
                    value={formData.github_username}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        github_username: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="token">Personal Access Token</Label>
                  <Input
                    id="token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxx"
                    value={formData.github_token}
                    onChange={(e) =>
                      setFormData({ ...formData, github_token: e.target.value })
                    }
                  />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    Requires repo and workflow scopes
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full"
                  disabled={!formData.github_username || !formData.github_token}
                  onClick={() => setStep(2)}
                >
                  Continue to Engine Setup
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="w-[450px] shadow-lg border-2">
              <CardHeader className="space-y-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-primary rounded-md">
                    <Server className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Agent Engine</CardTitle>
                </div>
                <CardDescription>
                  Choose the LLM provider and model for your workspace.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select
                    value={formData.llm_provider}
                    onValueChange={(val) =>
                      setFormData({ ...formData, llm_provider: val })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ollama">Ollama</SelectItem>
                      <SelectItem value="openai" disabled>
                        OpenAI (Coming Soon)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="base-url">Base URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="base-url"
                      placeholder="http://localhost:11434"
                      value={formData.llm_base_url}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          llm_base_url: e.target.value,
                        })
                      }
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={fetchModels}
                      disabled={fetchingModels}
                    >
                      {fetchingModels ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Globe className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select
                    value={formData.llm_model_name}
                    onValueChange={(val) =>
                      setFormData({ ...formData, llm_model_name: val })
                    }
                    disabled={models.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          models.length > 0
                            ? "Select Model"
                            : "Fetch models first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSave}
                  disabled={loading || !formData.llm_model_name}
                >
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Finish Setup
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

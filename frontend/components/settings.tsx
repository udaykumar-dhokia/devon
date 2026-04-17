"use client";

import * as React from "react";
import {
  GitBranchPlus,
  Globe,
  Loader2,
  Save,
  Server,
  Settings as SettingsIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface SettingsModalProps {
  initialConfig: any;
  onUpdate: (newConfig: any) => void;
}

export function SettingsModal({ initialConfig, onUpdate }: SettingsModalProps) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [fetchingModels, setFetchingModels] = React.useState(false);
  const [models, setModels] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const [formData, setFormData] = React.useState(initialConfig);

  const fetchModels = async () => {
    setFetchingModels(true);
    setError(null);
    try {
      const result = await window.electronAPI.fetchModels(
        formData.llm_base_url,
      );
      if (result.success) {
        setModels(result.models!);
      } else {
        setError(result.error || "Failed to fetch models.");
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
        onUpdate(formData);
        setOpen(false);
      } else {
        setError(result.error || "Failed to save configuration.");
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <SettingsIcon className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white dark:bg-zinc-950">
        <DialogHeader>
          <DialogTitle>App Settings</DialogTitle>
          <DialogDescription>
            Update your agent configuration and GitHub credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-4 border-b pb-4">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <GitBranchPlus className="w-4 h-4" /> Identity
            </h4>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="s-username" className="text-right text-xs">
                Username
              </Label>
              <Input
                id="s-username"
                className="col-span-3 h-8"
                value={formData.github_username}
                onChange={(e) =>
                  setFormData({ ...formData, github_username: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="s-token" className="text-right text-xs">
                Token
              </Label>
              <Input
                id="s-token"
                type="password"
                className="col-span-3 h-8"
                value={formData.github_token}
                onChange={(e) =>
                  setFormData({ ...formData, github_token: e.target.value })
                }
              />
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-medium flex items-center gap-2 text-sm">
              <Server className="w-4 h-4" /> LLM Settings
            </h4>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Base URL</Label>
              <div className="col-span-3 flex gap-2">
                <Input
                  className="h-8"
                  value={formData.llm_base_url}
                  onChange={(e) =>
                    setFormData({ ...formData, llm_base_url: e.target.value })
                  }
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8"
                  onClick={fetchModels}
                  disabled={fetchingModels}
                >
                  {fetchingModels ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Globe className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Model</Label>
              <div className="col-span-3">
                <Select
                  value={formData.llm_model_name}
                  onValueChange={(val) =>
                    setFormData({ ...formData, llm_model_name: val })
                  }
                >
                  <SelectTrigger className="w-full h-8">
                    <SelectValue placeholder="Select Model" />
                  </SelectTrigger>
                  <SelectContent>
                    {models.length > 0 ? (
                      models.map((m) => (
                        <SelectItem key={m.name} value={m.name}>
                          {m.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={formData.llm_model_name}>
                        {formData.llm_model_name}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button className="w-full" onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

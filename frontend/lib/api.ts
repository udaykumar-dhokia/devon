export class DevonAPI {
  private static backendUrl: string | null = null;

  private static async getUrl(): Promise<string> {
    if (this.backendUrl) return this.backendUrl;

    const url = await window.electronAPI.getBackendUrl();
    this.backendUrl = url;
    
    let retries = 5;
    while (retries > 0) {
      try {
        const response = await fetch(`${url}/health`);
        if (response.ok) break;
      } catch (e) {
        console.log(`Connection to backend failed, retrying... (${retries})`);
      }
      await new Promise(r => setTimeout(r, 1000));
      retries--;
    }
    
    return url;
  }

  static async listRepos() {
    const url = await this.getUrl();
    const response = await fetch(`${url}/repos`);
    if (!response.ok) {
      throw new Error("Failed to fetch repositories");
    }
    return response.json();
  }

  static async cloneRepo(name: string, cloneUrl: string) {
    const url = await this.getUrl();
    const response = await fetch(`${url}/repos/clone`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, url: cloneUrl }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || "Failed to clone repository");
    }
    return response.json();
  }

  static async getRepoTree(name: string) {
    const url = await this.getUrl();
    const response = await fetch(`${url}/repos/${name}/tree`);
    if (!response.ok) {
      throw new Error("Failed to fetch repository tree");
    }
    return response.json();
  }

  static async getHealth() {
    const url = await this.getUrl();
    try {
      const response = await fetch(`${url}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  static async getFileContent(repoName: string, path: string): Promise<string> {
    const url = await this.getUrl();
    const response = await fetch(`${url}/repos/${repoName}/file?path=${encodeURIComponent(path)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file content: ${response.statusText}`);
    }
    const data = await response.json();
    return data.content;
  }
}

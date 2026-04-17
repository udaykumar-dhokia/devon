import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import { spawn, execSync, ChildProcess } from "child_process";

let mainWindow: BrowserWindow | null = null;
let pythonProcess: ChildProcess | null = null;
const BACKEND_PORT = 8000;

const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;

function killProcessByPort(port: number) {
  try {
    if (process.platform === "win32") {
      const output = execSync(`netstat -ano | findstr :${port}`).toString();
      const lines = output.split("\n");
      for (const line of lines) {
        if (line.includes("LISTENING")) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== "0") {
            console.log(`Killing process ${pid} on port ${port}...`);
            execSync(`taskkill /F /T /PID ${pid}`);
          }
        }
      }
    }
  } catch (e) {
    // Port might not be in use, which is fine
  }
}

function startBackend() {
  killProcessByPort(BACKEND_PORT);
  console.log("Starting backend...");

  const cmd = "uv";
  const args = [
    "run",
    "python",
    "-m",
    "devon.server.main",
    "--port",
    BACKEND_PORT.toString(),
  ];

  pythonProcess = spawn(cmd, args, {
    cwd: path.join(__dirname, "..", ".."),
    shell: true,
  });

  pythonProcess.stdout?.on("data", (data) => {
    console.log(`Backend: ${data}`);
  });

  pythonProcess.stderr?.on("data", (data) => {
    console.error(`Backend Error: ${data}`);
  });

  pythonProcess.on("close", (code) => {
    console.log(`Backend process exited with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: "hiddenInset",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, "../out/index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.on("ready", () => {
  startBackend();
  createWindow();
});

function killBackend() {
  if (pythonProcess && pythonProcess.pid) {
    console.log(`Terminating backend process ${pythonProcess.pid}...`);
    try {
      if (process.platform === "win32") {
        execSync(`taskkill /F /T /PID ${pythonProcess.pid}`);
      } else {
        pythonProcess.kill();
      }
    } catch (e) {
      console.error("Failed to kill backend:", e);
    }
    pythonProcess = null;
  }
}

app.on("window-all-closed", () => {
  killBackend();
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  killBackend();
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers
const CONFIG_PATH = path.join(os.homedir(), ".devon", "config.json");

ipcMain.handle("get-backend-url", () => {
  return `http://127.0.0.1:${BACKEND_PORT}`;
});

ipcMain.handle("get-config", async () => {
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }
  try {
    const data = fs.readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading config:", error);
    return null;
  }
});

ipcMain.handle("save-config", async (event, config) => {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), "utf-8");
    return { success: true };
  } catch (error) {
    console.error("Error saving config:", error);
    return { success: false, error: String(error) };
  }
});

ipcMain.handle("fetch-models", async (event, baseUrl) => {
  try {
    const response = await fetch(`${baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }
    const data = await response.json();
    return { success: true, models: data.models || [] };
  } catch (error) {
    console.error("Error fetching models:", error);
    return { success: false, error: String(error) };
  }
});

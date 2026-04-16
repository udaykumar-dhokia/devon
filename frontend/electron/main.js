"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const child_process_1 = require("child_process");
let mainWindow = null;
let pythonProcess = null;
const BACKEND_PORT = 8000;
const isDev = process.env.NODE_ENV === 'development' || !electron_1.app.isPackaged;
function startBackend() {
    var _a, _b;
    console.log('Starting backend...');
    // Use 'uv run python' to ensure we use the correct environment
    const cmd = 'uv';
    const args = ['run', 'python', '-m', 'devon.server.main', '--port', BACKEND_PORT.toString()];
    pythonProcess = (0, child_process_1.spawn)(cmd, args, {
        cwd: path.join(__dirname, '..', '..'), // Run from project root
        shell: true,
    });
    (_a = pythonProcess.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
        console.log(`Backend: ${data}`);
    });
    (_b = pythonProcess.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
        console.error(`Backend Error: ${data}`);
    });
    pythonProcess.on('close', (code) => {
        console.log(`Backend process exited with code ${code}`);
    });
}
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
        titleBarStyle: 'hiddenInset',
    });
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        // mainWindow.webContents.openDevTools();
    }
    else {
        mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}
electron_1.app.on('ready', () => {
    startBackend();
    createWindow();
});
electron_1.app.on('window-all-closed', () => {
    if (pythonProcess) {
        if (process.platform === 'win32') {
            (0, child_process_1.spawn)('taskkill', ['/F', '/T', '/PID', pythonProcess.pid.toString()], { shell: true });
        }
        else {
            pythonProcess.kill();
        }
    }
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});
// IPC Handlers
const CONFIG_PATH = path.join(os.homedir(), '.devon', 'config.json');
electron_1.ipcMain.handle('get-backend-url', () => {
    return `http://127.0.0.1:${BACKEND_PORT}`;
});
electron_1.ipcMain.handle('get-config', () => __awaiter(void 0, void 0, void 0, function* () {
    if (!fs.existsSync(CONFIG_PATH)) {
        return null;
    }
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(data);
    }
    catch (error) {
        console.error('Error reading config:', error);
        return null;
    }
}));
electron_1.ipcMain.handle('save-config', (event, config) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf-8');
        return { success: true };
    }
    catch (error) {
        console.error('Error saving config:', error);
        return { success: false, error: String(error) };
    }
}));
electron_1.ipcMain.handle('fetch-models', (event, baseUrl) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const response = yield fetch(`${baseUrl}/api/tags`);
        if (!response.ok) {
            throw new Error(`Ollama responded with ${response.status}`);
        }
        const data = yield response.json();
        return { success: true, models: data.models || [] };
    }
    catch (error) {
        console.error('Error fetching models:', error);
        return { success: false, error: String(error) };
    }
}));

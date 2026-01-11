const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let pythonProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, // 稍微加宽，给 3D 视野更多空间
    height: 900,
    backgroundColor: '#000000',
    // 🔥 [视觉优化] 隐藏标题栏，让 UI 更有沉浸感
    titleBarStyle: 'hiddenInset', 
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false, // 简化第一个原型的开发
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend/dist/index.html'));
}

function startPythonBackend() {
  const isDev = !app.isPackaged;
  const script = isDev 
    ? path.join(__dirname, 'backend/dist/strand-brain/strand-brain') 
    : path.join(process.resourcesPath, 'strand-brain');

  console.log(`[System] Launching Brain at: ${script}`);
  pythonProcess = spawn(script);

  pythonProcess.stdout.on('data', (data) => console.log(`[Brain]: ${data}`));
}

// 🔥 [关键修复] 确保退出时彻底杀掉后端，不留僵尸进程
app.on('will-quit', () => {
  if (pythonProcess) {
    console.log("[System] Terminating Brain process...");
    pythonProcess.kill('SIGINT');
  }
});

app.whenReady().then(() => {
  startPythonBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
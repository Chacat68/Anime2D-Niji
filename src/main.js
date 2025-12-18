import { app, BrowserWindow, dialog, ipcMain, Menu } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;

function normalizeBaseUrl(baseUrl) {
  const trimmed = String(baseUrl ?? '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

async function getNextSequence(dirPath, prefix) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let maxSeq = 0;

    const pattern = new RegExp(`^${prefix}-(\\d+)\\.(png|jpg|jpeg|webp|gif)$`, 'i');
    
    for (const ent of entries) {
      if (!ent.isFile()) continue;
      const match = ent.name.match(pattern);
      if (match) {
        const seq = parseInt(match[1], 10);
        if (!isNaN(seq) && seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    return maxSeq + 1;
  } catch (e) {
    return 1;
  }
}

function sequentialFileName(prefix, seq, ext) {
  return `${prefix}-${seq}.${ext}`;
}

function extFromContentType(contentType) {
  const ct = String(contentType ?? '').toLowerCase();
  if (ct.includes('image/png')) return 'png';
  if (ct.includes('image/jpeg') || ct.includes('image/jpg')) return 'jpg';
  if (ct.includes('image/webp')) return 'webp';
  if (ct.includes('image/gif')) return 'gif';
  return 'png';
}

async function listImagesInDir(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

  const files = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    const ext = path.extname(ent.name).toLowerCase();
    if (!imageExts.has(ext)) continue;

    const fullPath = path.join(dirPath, ent.name);
    const st = await fs.stat(fullPath);
    files.push({
      name: ent.name,
      path: fullPath,
      url: pathToFileURL(fullPath).toString(),
      mtimeMs: st.mtimeMs
    });
  }

  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return files.map(({ name, path: p, url }) => ({ name, path: p, url }));
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function createMenu() {
  const isMac = process.platform === 'darwin';
  
  const template = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { label: '关于 ' + app.name, role: 'about' },
        { type: 'separator' },
        { label: '退出', accelerator: 'Command+Q', role: 'quit' }
      ]
    }] : []),
    {
      label: '文件',
      submenu: [
        {
          label: '退出',
          accelerator: isMac ? 'Command+Q' : 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { label: '撤销', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: '重做', accelerator: 'Shift+CmdOrCtrl+Z', role: 'redo' },
        { type: 'separator' },
        { label: '剪切', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: '复制', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: '粘贴', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: '全选', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: '视图',
      submenu: [
        {
          label: '重新加载',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        {
          label: '调试',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: '全屏',
          accelerator: isMac ? 'Ctrl+Command+F' : 'F11',
          click: () => {
            if (mainWindow) {
              mainWindow.setFullScreen(!mainWindow.isFullScreen());
            }
          }
        }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '服务商配置说明',
          click: () => {
            createHelpWindow();
          }
        },
        { type: 'separator' },
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '本地AI画图客户端',
              detail: '版本 0.1.0\n\n支持自定义 API、选择目录加载图片、输入提示词生成图像\n\n© 2025 Anime2D-Niji',
              buttons: ['确定']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createHelpWindow() {
  const helpWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  helpWindow.loadFile(path.join(__dirname, 'renderer', 'help.html'));
  helpWindow.setMenuBarVisibility(false);
}

app.whenReady().then(async () => {
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

ipcMain.handle('chooseDirectory', async () => {
  if (!mainWindow) return null;
  
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择图片目录',
    properties: ['openDirectory']
  });

  if (result.canceled) return null;
  return result.filePaths?.[0] ?? null;
});

ipcMain.handle('listImages', async (_evt, dirPath) => {
  if (!dirPath) return [];
  return await listImagesInDir(String(dirPath));
});

ipcMain.handle('generateImage', async (_evt, payload) => {
  const baseUrl = normalizeBaseUrl(payload?.baseUrl);
  const apiKey = String(payload?.apiKey ?? '');
  const model = String(payload?.model ?? '').trim();
  const prompt = String(payload?.prompt ?? '').trim();
  const outputDir = String(payload?.outputDir ?? '');
  const namePrefix = String(payload?.namePrefix ?? 'generated').trim() || 'generated';

  if (!baseUrl) throw new Error('请填写 API Base URL');
  if (!prompt) throw new Error('请填写提示词');
  if (!outputDir) throw new Error('请先选择目录');

  const endpoint = `${baseUrl}/images/generations`;

  const body = {
    prompt,
    n: 1,
    size: '1024x1024'
  };
  if (model) body.model = model;

  const headers = {
    'Content-Type': 'application/json'
  };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const resp = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    throw new Error(`API 请求失败 (${resp.status}): ${text || resp.statusText}`);
  }

  const json = await resp.json();
  const first = json?.data?.[0];

  let imageBytes;
  let ext = 'png';

  if (first?.b64_json) {
    imageBytes = Buffer.from(String(first.b64_json), 'base64');
    ext = 'png';
  } else if (first?.url) {
    const imgResp = await fetch(String(first.url));
    if (!imgResp.ok) {
      const text = await imgResp.text().catch(() => '');
      throw new Error(`下载生成图片失败 (${imgResp.status}): ${text || imgResp.statusText}`);
    }
    ext = extFromContentType(imgResp.headers.get('content-type'));
    const ab = await imgResp.arrayBuffer();
    imageBytes = Buffer.from(ab);
  } else {
    throw new Error('无法解析 API 返回（未找到 data[0].b64_json 或 data[0].url）');
  }

  const seq = await getNextSequence(outputDir, namePrefix);
  const fileName = sequentialFileName(namePrefix, seq, ext);
  const savedPath = path.join(outputDir, fileName);
  await fs.writeFile(savedPath, imageBytes);

  return {
    savedPath,
    savedUrl: pathToFileURL(savedPath).toString()
  };
});

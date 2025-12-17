import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function normalizeBaseUrl(baseUrl) {
  const trimmed = String(baseUrl ?? '').trim();
  if (!trimmed) return '';
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
}

function uniqueFileName(prefix, ext) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const ts =
    String(now.getFullYear()) +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    '-' +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds());

  const rand = Math.random().toString(16).slice(2, 8);
  return `${prefix}-${ts}-${rand}.${ext}`;
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
  const win = new BrowserWindow({
    width: 1100,
    height: 760,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
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
  const result = await dialog.showOpenDialog({
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

  const fileName = uniqueFileName('generated', ext);
  const savedPath = path.join(outputDir, fileName);
  await fs.writeFile(savedPath, imageBytes);

  return {
    savedPath,
    savedUrl: pathToFileURL(savedPath).toString()
  };
});

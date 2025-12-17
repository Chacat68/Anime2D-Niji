let selectedDir = null;
let selectedSaveDir = null;

const elBaseUrl = document.getElementById('baseUrl');
const elApiKey = document.getElementById('apiKey');
const elModel = document.getElementById('model');
const elChooseDir = document.getElementById('chooseDir');
const elDirPath = document.getElementById('dirPath');
const elChooseSaveDir = document.getElementById('chooseSaveDir');
const elSaveDirPath = document.getElementById('saveDirPath');
const elNamePrefix = document.getElementById('namePrefix');
const elPrompt = document.getElementById('prompt');
const elStart = document.getElementById('start');
const elStatus = document.getElementById('status');
const elGrid = document.getElementById('grid');
const elRefresh = document.getElementById('refresh');

function setStatus(text) {
  elStatus.textContent = text || '';
}

function setDir(dir) {
  selectedDir = dir;
  elDirPath.textContent = dir || '未选择';
}

function setSaveDir(dir) {
  selectedSaveDir = dir;
  elSaveDirPath.textContent = dir || '未选择（默认使用图片目录）';
}

function setBusy(busy) {
  elStart.disabled = busy;
  elChooseDir.disabled = busy;
  elChooseSaveDir.disabled = busy;
  elRefresh.disabled = busy;
}

function clearGrid() {
  elGrid.innerHTML = '';
}

function renderImages(items) {
  clearGrid();

  if (!items || items.length === 0) {
    const empty = document.createElement('div');
    empty.style.color = '#6b7280';
    empty.style.fontSize = '12px';
    empty.textContent = '目录中没有图片';
    elGrid.appendChild(empty);
    return;
  }

  for (const it of items) {
    const card = document.createElement('div');
    card.className = 'card';

    const img = document.createElement('img');
    img.className = 'thumb';
    img.src = it.url;
    img.alt = it.name;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.title = it.path;
    meta.textContent = it.name;

    card.appendChild(img);
    card.appendChild(meta);
    elGrid.appendChild(card);
  }
}

async function refreshImages() {
  if (!selectedDir) {
    renderImages([]);
    return;
  }

  const items = await window.api.listImages(selectedDir);
  renderImages(items);
}

elChooseDir.addEventListener('click', async () => {
  try {
    setBusy(true);
    setStatus('选择图片目录中...');
    const dir = await window.api.chooseDirectory();
    if (!dir) {
      setStatus('已取消');
      return;
    }
    setDir(dir);
    setStatus('加载图片中...');
    await refreshImages();
    setStatus('就绪');
  } catch (e) {
    setStatus(e?.message || String(e));
  } finally {
    setBusy(false);
  }
});

elChooseSaveDir.addEventListener('click', async () => {
  try {
    setBusy(true);
    setStatus('选择保存目录中...');
    const dir = await window.api.chooseDirectory();
    if (!dir) {
      setStatus('已取消');
      return;
    }
    setSaveDir(dir);
    setStatus('就绪');
  } catch (e) {
    setStatus(e?.message || String(e));
  } finally {
    setBusy(false);
  }
});

elRefresh.addEventListener('click', async () => {
  try {
    setBusy(true);
    setStatus('刷新中...');
    await refreshImages();
    setStatus('就绪');
  } catch (e) {
    setStatus(e?.message || String(e));
  } finally {
    setBusy(false);
  }
});

elStart.addEventListener('click', async () => {
  const baseUrl = elBaseUrl.value;
  const apiKey = elApiKey.value;
  const model = elModel.value;
  const prompt = elPrompt.value;
  const namePrefix = elNamePrefix.value;

  try {
    setBusy(true);
    setStatus('请求生成中...');

    const result = await window.api.generateImage({
      baseUrl,
      apiKey,
      model,
      prompt,
      outputDir: selectedSaveDir || selectedDir,
      namePrefix: namePrefix || 'generated'
    });

    setStatus('已保存：' + (result?.savedPath || ''));
    await refreshImages();
  } catch (e) {
    setStatus(e?.message || String(e));
  } finally {
    setBusy(false);
  }
});

// 初始状态
setDir(null);
setSaveDir(null);
renderImages([]);
setStatus('就绪');

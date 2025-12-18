let selectedDir = null;
let selectedSaveDir = null;

const elProvider = document.getElementById('provider');
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

// 服务商预设配置
const PROVIDER_PRESETS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'dall-e-3',
    models: [
      { value: 'dall-e-3', label: 'DALL-E 3' },
      { value: 'dall-e-2', label: 'DALL-E 2' }
    ]
  },
  gemini: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    model: 'gemini-2.5-flash-image',
    models: [
      { value: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash (Nano Banana) - 快速' },
      { value: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro (Nano Banana Pro) - 4K高级' },
      { value: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash Exp' }
    ]
  },
  azure: {
    baseUrl: 'https://your-resource.openai.azure.com',
    model: 'dall-e-3',
    models: [
      { value: 'dall-e-3', label: 'DALL-E 3' },
      { value: 'dall-e-2', label: 'DALL-E 2' }
    ]
  },
  local: {
    baseUrl: 'http://localhost:8000/v1',
    model: 'stable-diffusion',
    models: [
      { value: 'stable-diffusion', label: 'Stable Diffusion' },
      { value: 'flux', label: 'Flux' },
      { value: 'midjourney', label: 'Midjourney' }
    ]
  },
  custom: {
    baseUrl: '',
    model: '',
    models: [
      { value: '', label: '自定义模型' }
    ]
  }
};

// 更新模型选择器
function updateModelSelector(provider) {
  const preset = PROVIDER_PRESETS[provider];
  
  // 清空现有选项
  elModel.innerHTML = '';
  
  if (preset && preset.models) {
    // 填充预设模型选项
    preset.models.forEach(m => {
      const option = document.createElement('option');
      option.value = m.value;
      option.textContent = m.label;
      elModel.appendChild(option);
    });
  } else {
    // 没有预设模型时显示默认选项
    const option = document.createElement('option');
    option.value = '';
    option.textContent = '请配置模型';
    elModel.appendChild(option);
  }
}

// 从localStorage加载配置
function loadProviderConfig(provider) {
  const saved = localStorage.getItem(`provider_${provider}`);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved config:', e);
    }
  }
  return PROVIDER_PRESETS[provider] || PROVIDER_PRESETS.custom;
}

// 保存配置到localStorage
function saveProviderConfig(provider) {
  const config = {
    baseUrl: elBaseUrl.value,
    apiKey: elApiKey.value,
    model: elModel.value
  };
  localStorage.setItem(`provider_${provider}`, JSON.stringify(config));
}

// 应用配置到界面
function applyConfig(config) {
  elBaseUrl.value = config.baseUrl || '';
  elApiKey.value = config.apiKey || '';
  
  updateModelSelector(elProvider.value);
  
  // 设置模型值
  const modelValue = config.model || PROVIDER_PRESETS[elProvider.value]?.model || '';
  elModel.value = modelValue;
}

// 切换服务商
function switchProvider(provider) {
  // 保存当前配置
  const currentProvider = elProvider.value;
  if (currentProvider) {
    saveProviderConfig(currentProvider);
  }
  
  // 加载新配置
  const config = loadProviderConfig(provider);
  applyConfig(config);
  
  // 保存选择的服务商
  localStorage.setItem('selectedProvider', provider);
  
  setStatus('已切换到: ' + elProvider.options[elProvider.selectedIndex].text);
}

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

// 服务商切换事件
elProvider.addEventListener('change', () => {
  switchProvider(elProvider.value);
});

// 模型选择变化时保存
elModel.addEventListener('change', () => {
  saveProviderConfig(elProvider.value);
});

// 配置变化时自动保存
[elBaseUrl, elApiKey].forEach(el => {
  el.addEventListener('blur', () => {
    saveProviderConfig(elProvider.value);
  });
});

// 初始化：加载上次选择的服务商
const lastProvider = localStorage.getItem('selectedProvider') || 'gemini';
elProvider.value = lastProvider;
const initialConfig = loadProviderConfig(lastProvider);
applyConfig(initialConfig);

// 初始状态
setDir(null);
setSaveDir(null);
renderImages([]);
setStatus('就绪');

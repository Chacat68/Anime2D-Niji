# Anime2D-Niji

本地 AI 画图客户端 - 支持自定义 API、选择目录加载图片、输入提示词生成图像

## ✨ 功能特性

- 🔧 **自定义 API 配置**：支持填写 API Base URL、API Key 和模型名称
- 📁 **目录管理**：选择目录并自动加载展示目录中的图片
- 🎨 **AI 画图**：输入提示词调用 API 生成图片
- 💾 **自动保存**：生成的图片自动保存到选择的目录并刷新列表
- 🖼️ **图片预览**：网格布局展示目录中的所有图片

## 🚀 快速开始

### 方式一：一键启动（推荐）

**首次运行：**
1. 确保已安装 [Node.js](https://nodejs.org/) (v18 或更高版本)
2. 双击 `start.bat` 文件
3. 脚本会自动安装依赖并启动应用

**后续运行：**
- 直接双击 `start.bat` 即可启动

### 方式二：命令行启动

```bash
# 1. 安装依赖（首次运行）
npm install

# 2. 启动应用
npm start
```

或使用批处理脚本：
```bash
# 仅安装依赖
install.bat

# 启动应用
start.bat
```

## 📖 使用说明

1. **配置 API**
   - 在左侧面板填写 API Base URL（默认：`https://api.openai.com/v1`）
   - 如需要，填写 API Key 和 Model 名称

2. **选择目录**
   - 点击"选择目录"按钮，选择用于保存和查看图片的文件夹
   - 右侧会自动显示该目录中的所有图片

3. **生成图片**
   - 在"提示词"框中输入描述
   - 点击"开始"按钮
   - 生成的图片会自动保存到选择的目录，并在右侧列表中显示

4. **刷新列表**
   - 点击右上角"刷新"按钮可重新加载目录中的图片

## 🛠️ 技术栈

- **Electron**：跨平台桌面应用框架
- **原生 JavaScript**：无需额外框架，轻量简洁
- **OpenAI API 兼容接口**：支持标准的图像生成 API

## 📝 API 格式说明

本应用兼容 OpenAI 图像生成 API 格式：

**端点：** `POST {baseUrl}/images/generations`

**请求体：**
```json
{
  "prompt": "你的提示词",
  "model": "dall-e-3",
  "n": 1,
  "size": "1024x1024"
}
```

**响应格式支持：**
- `data[0].b64_json`：Base64 编码的图片数据
- `data[0].url`：图片下载链接

## 🔧 项目结构

```
Anime2D-Niji/
├── src/
│   ├── main.js           # Electron 主进程
│   ├── preload.js        # 预加载脚本
│   └── renderer/         # 渲染进程（前端页面）
│       ├── index.html
│       ├── style.css
│       └── renderer.js
├── package.json
├── start.bat             # Windows 快速启动脚本
├── install.bat           # Windows 依赖安装脚本
└── README.md
```

## 📄 许可证

MIT License
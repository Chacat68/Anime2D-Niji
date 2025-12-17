@echo off
chcp 65001 >nul
title 本地AI画图客户端 - 快速启动

echo.
echo ==========================================
echo   本地AI画图客户端 - 快速启动
echo ==========================================
echo.

if not exist "node_modules\" (
    echo [1/2] 检测到首次运行，正在安装依赖（使用中国镜像加速）...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败！
        echo 请确保已安装 Node.js 和 npm
        pause
        exit /b 1
    )
    echo.
    echo [依赖安装完成]
    echo.
) else (
    echo [1/2] 依赖检查完成
    echo.
)

echo [2/2] 正在启动应用...
echo.
npm start

if errorlevel 1 (
    echo.
    echo [错误] 启动失败！
    pause
)

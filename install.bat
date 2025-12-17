@echo off
chcp 65001 >nul
title 本地AI画图客户端 - 安装依赖

echo.
echo ==========================================
echo   本地AI画图客户端 - 安装依赖
echo ==========================================
echo.

echo 正在安装依赖包...
echo.

call npm install

if errorlevel 1 (
    echo.
    echo [错误] 安装失败！
    echo 请确保已安装 Node.js (v18 或更高版本) 和 npm
    pause
    exit /b 1
)

echo.
echo ==========================================
echo   安装完成！
echo ==========================================
echo.
echo 现在可以双击 start.bat 启动应用
echo.
pause

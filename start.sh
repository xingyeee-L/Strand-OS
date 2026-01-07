#!/bin/bash

echo "🚀 初始化 Strand 认知系统..."

# 1. 启动后端 (在后台运行)
echo "🧠 正在唤醒神经中枢 (Backend)..."
cd backend
source venv/bin/activate
uvicorn main:app --reload > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 2. 启动前端 (在后台运行)
echo "📺 正在加载全息界面 (Frontend)..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "✅ 系统在线!"
echo "   - 后端 PID: $BACKEND_PID"
echo "   - 前端 PID: $FRONTEND_PID"
echo "   - 访问地址: http://localhost:5173"
echo "Press CTRL+C to shutdown."

# 等待用户关闭
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait
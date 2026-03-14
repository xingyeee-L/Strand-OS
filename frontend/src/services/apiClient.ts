import axios from 'axios';

const devOrigin =
  typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : 'http://127.0.0.1:5173';

const baseURL = import.meta.env.DEV
  ? `${devOrigin}/api`
  : (import.meta.env.VITE_BACKEND_URL || 'http://127.0.0.1:8000');

export const apiClient = axios.create({ 
  baseURL,
  headers: {
    // 穿透神器免验证暗号（极其关键！）
    'ngrok-skip-browser-warning': 'true',  // 专门绕过 Ngrok 的警告拦截
    'bypass-tunnel-reminder': 'true'       // 专门绕过 Localtunnel 的警告拦截
  }
});

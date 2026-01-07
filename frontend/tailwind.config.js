/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {fontFamily: {
        // 如果你有喜欢的字体，也可以去 index.html 引入 google fonts
        // 这里暂时用等宽字体模拟终端感，或者你可以指定一个更像游戏的字体
        'rpg': ['"Courier New"', 'Courier', 'monospace'],
      },
      colors: {
        'dialogue-bg': 'rgba(5, 10, 15, 0.95)', // 极深的蓝黑底色
        'dialogue-border': '#00f2ff',           // 默认青色边框
        'dialogue-highlight': '#ffaa00',        // 高亮橙色
      },
      animation: {
        'typewriter': 'typewriter 2s steps(40) 1s 1 normal both',
        'fade-in-up': 'fadeInUp 0.3s ease-out forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }},
  },
  plugins: [],
}
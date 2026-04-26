import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// אם תפרסם ל-GitHub Pages תחת https://USER.github.io/mesimot/
// השאר את ה-base הזה. אם תפרסם לדומיין משלך או ל-USER.github.io (ללא תת-נתיב) - שנה ל-'/'.
export default defineConfig({
  plugins: [react()],
  base: '/mesimot/',
});

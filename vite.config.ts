import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  /*
   * GitHub Pages 는 https://<계정>.github.io/<저장소>/ 처럼 하위 경로에 올라갑니다.
   * 상대 경로로 두면 로컬 개발·Pages 양쪽에서 자산 주소가 그대로 맞습니다.
   */
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5273,
  },
})

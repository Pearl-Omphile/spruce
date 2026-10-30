import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Relative base so the build works at https://<user>.github.io/<repo>/
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  // Older target so the app also runs on phones with an out-of-date Android WebView
  build: { chunkSizeWarningLimit: 700, target: ['es2020', 'chrome87', 'safari14', 'firefox78'] },
})

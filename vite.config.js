import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    // Output to a folder named 'dist'
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        rewards: resolve(__dirname, 'rewards/index.html'),
      },
      output: {
        // Force specific filenames so we can enqueue them in PHP easily
        entryFileNames: `assets/gotoguys-main.js`,
        assetFileNames: `assets/gotoguys-style.[ext]`,
      }
    }
  }
})

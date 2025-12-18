import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // আপনার রিপোজিটরির নাম অনুযায়ী base সেট করতে হবে
  base: '/Pixar-AI-Studio/',
})
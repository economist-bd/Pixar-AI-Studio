import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // ভার্সেলের জন্য বেস পাথ ঠিক রাখা জরুরি
  base: '/',
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Uncomment the base line below if deploying to GitHub Pages
  // base: '/crossfit-leaderboard/',
})

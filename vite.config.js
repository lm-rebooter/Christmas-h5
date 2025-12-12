import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // 监听 0.0.0.0，局域网可访问
    port: 5173,
    strictPort: true,
    // HMR 在某些内网下需要明确 host，按需填写本机 IP
    // hmr: { host: '10.8.16.4' },
  },
})

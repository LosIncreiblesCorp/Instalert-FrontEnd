import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && mode === 'production' && !environment.VITE_INSTALERT_PLATFORM_API_URL?.trim()) {
    throw new Error('Set VITE_INSTALERT_PLATFORM_API_URL to the ASP.NET API URL including /api/v1 before building for production.');
  }
  return { plugins: [vue()] };
})

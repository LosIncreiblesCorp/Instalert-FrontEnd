import vue from '@vitejs/plugin-vue'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const environment = loadEnv(mode, process.cwd(), 'VITE_');
  if (command === 'build' && mode === 'production' && !environment.VITE_INSTALERT_PLATFORM_API_URL?.trim()) {
    throw new Error('Set VITE_INSTALERT_PLATFORM_API_URL to the ASP.NET API URL including /api/v1 before building for production.');
  }
  if (command === 'build' && mode === 'production') {
    let api;
    try { api = new URL(environment.VITE_INSTALERT_PLATFORM_API_URL); }
    catch { throw new Error('Set a valid public HTTPS API URL ending in /api/v1.'); }
    if (api.protocol !== 'https:' || !api.pathname.replace(/\/+$/, '').endsWith('/api/v1') || api.search || api.hash)
      throw new Error('The production API URL must use HTTPS and end in /api/v1.');
    if (environment.VITE_PAYPAL_ENVIRONMENT !== 'sandbox' || !environment.VITE_PAYPAL_CLIENT_ID?.trim())
      throw new Error('Configure the public PayPal Sandbox client ID and environment before building.');
  }
  return { plugins: [vue()] };
})

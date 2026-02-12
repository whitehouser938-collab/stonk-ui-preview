import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Proxy configuration for local development
    // This solves the cookie issue where different origins (ports) prevent
    // cookies from being sent with fetch requests.
    //
    // How it works:
    // 1. Frontend runs on localhost:8080
    // 2. Auth service runs on localhost:3001
    // 3. Vite proxies /auth/* requests to :3001
    // 4. Cookies are set for localhost:8080 (same origin)
    // 5. Subsequent requests include cookies automatically
    //
    // Production doesn't use proxy - uses full URLs with CORS + sameSite='none'
    proxy: mode === 'development' ? {
      '/auth': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      }
    } : undefined,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Production build optimizations
    sourcemap: mode === 'production' ? false : true, // No source maps in production for security
    minify: 'esbuild', // Fast minification
    target: 'esnext',
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'web3-vendor': ['wagmi', 'viem', '@reown/appkit', '@reown/appkit-adapter-wagmi'],
          'ui-vendor': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          'chart-vendor': ['recharts'],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
  },
  // Environment variable validation happens in src/utils/env.ts
}));

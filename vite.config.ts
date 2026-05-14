import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import tailwindcss from '@tailwindcss/vite';
import { copyFile, mkdir } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import type { Plugin } from 'vite';

const FFMPEG_CORE_DIR = path.resolve(__dirname, 'node_modules/@ffmpeg/core/dist');
const FFMPEG_FILES = ['ffmpeg-core.js', 'ffmpeg-core.wasm', 'ffmpeg-core.worker.js'];

/**
 * Serves /ffmpeg/* from @ffmpeg/core/dist in dev and copies files to dist/ffmpeg/ on build.
 * Keeps the WASM self-hosted without CDN dependency.
 */
function ffmpegCorePlugin(): Plugin {
  return {
    name: 'ffmpeg-core',
    configureServer(server) {
      server.middlewares.use('/ffmpeg', (req, res, next) => {
        const file = (req.url || '/').replace(/^\/+/, '');
        if (!FFMPEG_FILES.includes(file)) return next();
        const filePath = path.join(FFMPEG_CORE_DIR, file);
        if (!existsSync(filePath)) return next();
        const contentType =
          file.endsWith('.wasm') ? 'application/wasm' : 'text/javascript';
        res.setHeader('Content-Type', contentType);
        createReadStream(filePath).pipe(res);
      });
    },
    async writeBundle(options) {
      const outDir = options.dir ?? path.resolve(__dirname, 'dist');
      const dest = path.join(outDir, 'ffmpeg');
      await mkdir(dest, { recursive: true });
      await Promise.all(
        FFMPEG_FILES.map(file =>
          copyFile(path.join(FFMPEG_CORE_DIR, file), path.join(dest, file)),
        ),
      );
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ffmpegCorePlugin(),
  ],
  build: {
    // Reduce chunking to minimize requests via ngrok
    rollupOptions: {
      output: {
        manualChunks: undefined, // Disable auto chunking
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@components': path.resolve(__dirname, './src/components'),
      '@constants': path.resolve(__dirname, './src/constants'),
      '@contexts': path.resolve(__dirname, './src/contexts'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@routes': path.resolve(__dirname, './src/routes'),
      '@services': path.resolve(__dirname, './src/services'),
      '@styles': path.resolve(__dirname, './src/styles'),
      '@types': path.resolve(__dirname, './src/types'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    host: true, // Listen on all addresses
    port: 5173,
    strictPort: true,
    allowedHosts: true, // Allow all hosts (like evolution-hub)
    cors: true, // Enable CORS for ngrok
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept',
    },
    proxy: {
      '/proxy-crm': {
        target: 'https://crm.kaiabi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-crm/, '')
      },
      '/proxy-auth': {
        target: 'https://auth.kaiabi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-auth/, '')
      },
      '/proxy-core': {
        target: 'https://core.kaiabi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-core/, '')
      },
      '/proxy-bot': {
        target: 'https://bot.kaiabi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/proxy-bot/, '')
      }
    },
    hmr: {
      // Reduce HMR overhead via ngrok
      overlay: false, // Disable error overlay
    },
    fs: {
      // Reduce file system requests
      strict: false,
    },
  },
  optimizeDeps: {
    // Pre-bundle these to avoid dynamic imports via ngrok
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@evoapi/design-system',
      'lucide-react',
      'sonner',
      'zustand',
    ],
    // Force optimization on start
    force: true,
  },
  // Reduce module transformation in dev
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' },
  },
});

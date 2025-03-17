import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8082,
    strictPort: false,
    open: true,
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('zustand')) {
              return 'zustand';
            }
            if (id.includes('react')) {
              return 'react';
            }
            return 'vendor';
          }
        },
      },
    },
  },
  base: "/",
  optimizeDeps: {
    include: ['zustand', 'zustand/middleware'],
    esbuildOptions: {
      target: 'es2020',
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

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
    target: 'es2020',
    rollupOptions: {
      external: ['zustand'],
      output: {
        globals: {
          zustand: 'Zustand'
        }
      }
    },
  },
  base: "/",
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  }
});

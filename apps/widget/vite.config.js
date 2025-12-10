import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5001,
    strictPort: true,
    cors: {
      origin: "*",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    strictPort: true,
    cors: {
      origin: "*",
    },
    // Preview mode doesn't watch files by default - it only serves built files
  },
  build: {
    lib: {
      entry: "src/widget.jsx",
      name: "HomesfyChat",
      fileName: () => "widget.js",
      formats: ["umd"],
    },
    rollupOptions: {
      external: [], // Bundle React and ReactDOM instead of expecting them as externals
      output: {
        // Optimize chunk size
        manualChunks: undefined,
      },
    },
    minify: true, // Use default minifier (esbuild)
    sourcemap: false, // Disable sourcemap for production to reduce size
    chunkSizeWarningLimit: 1000,
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(process.env.NODE_ENV),
  },
  optimizeDeps: {
    include: ["react", "react-dom"],
  },
});



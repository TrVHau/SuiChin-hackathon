import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

const projectRoot = path.resolve(__dirname);
const viteRoot =
  process.platform === "win32"
    ? projectRoot.replace(/^[A-Z]:/, (drive) => drive.toLowerCase())
    : projectRoot;

export default defineConfig({
  root: viteRoot,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(viteRoot, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});

import { defineConfig } from "vite"
import viteCompression from "vite-plugin-compression"

// https://vitejs.dev/config/
export default defineConfig({
  root: "./",
  publicDir: "public",
  plugins: [
    viteCompression({ algorithm: "gzip" }),
    viteCompression({ algorithm: "brotliCompress" }),
  ],
  server: {
    hmr: true,
    fs: {
      // Allow serving files from one level up to the project root
      allow: [".."],
    },
  },
})

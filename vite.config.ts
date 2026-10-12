import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  // `npm run dev:api` runs the mail server on 8787; forward /api to it during development
  server: { proxy: { "/api": "http://localhost:8787" } },
  // `npm start` serves the built dist/ (used when deployed as a Render web service)
  preview: { host: true, port: Number(process.env.PORT) || 3108, allowedHosts: true },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Keep three.js / R3F out of the entry chunk; they load with the first 3D scene.
        manualChunks(id) {
          if (id.includes("node_modules/three/") || id.includes("@react-three") || id.includes("three-stdlib") || id.includes("troika")) return "three";
          if (id.includes("node_modules/gsap")) return "gsap";
          if (id.includes("node_modules/framer-motion") || id.includes("node_modules/motion-")) return "motion";
        },
      },
    },
  },
});

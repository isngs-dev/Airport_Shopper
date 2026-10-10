import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
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

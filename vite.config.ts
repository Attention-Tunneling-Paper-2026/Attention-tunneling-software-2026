import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, isPreview }) => ({
  base:
    command === "build" || isPreview === true
      ? "/Attention-tunneling-software-2026/"
      : "/",
  plugins: [react()],
}));
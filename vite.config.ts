import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { pagePreloads } from "./scripts/pagePreloads";

export default defineConfig({ plugins: [react(), pagePreloads()] });

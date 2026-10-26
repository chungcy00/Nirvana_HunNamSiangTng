import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { pagePreloads } from "./scripts/pagePreloads";
import { createImageHandler } from "./apps/admin/server/catalogImage";

export default defineConfig(({mode}) => {
  const imageHandler = createImageHandler({env:loadEnv(mode,process.cwd(),"")});
  return { plugins: [react(), pagePreloads(), {
    name:"local-catalog-image-service",
    configureServer(server) {
      server.middlewares.use((req,res,next) => {
        if (req.url?.split("?")[0] === "/api/catalog-image") void imageHandler(req,res);
        else next();
      });
    },
  }] };
});

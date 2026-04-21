import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Swagger/OpenAPI живут на FastAPI (порт 8001). Прокси нужен, если открываете
    // http://localhost:5173/docs — иначе используйте http://127.0.0.1:8001/docs
    proxy: {
      "/openapi.json": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/docs": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
      "/redoc": {
        target: "http://127.0.0.1:8001",
        changeOrigin: true,
      },
    },
  },
});


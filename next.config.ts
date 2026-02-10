import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Andere Configs hier lassen, falls vorhanden */
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000', 
        // Die URL aus deinem Fehler-Log (ohne https://):
        'organic-cod-q7j64r7w94jxc9vw-3000.app.github.dev' 
      ]
    }
  }
};

export default nextConfig;
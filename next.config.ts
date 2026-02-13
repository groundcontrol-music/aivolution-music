import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        'organic-cod-q7j64r7w94jxc9vw-3000.app.github.dev',
        '*.app.github.dev'
      ]
    }
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Referrer-Policy',
            value: 'no-referrer-when-downgrade',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
      /* config options here */
      allowedDevOrigins: [
            '10.1.60.205',
            '10.1.60.205:3000',
            'localhost',
            'localhost:3000',
            '127.0.0.1',
            '127.0.0.1:3000',
            '*.local',
      ],
      turbopack: {
            rules: {
                  "*.css": {
                        loaders: ["@tailwindcss/turbopack"],
                        as: "*.css",
                  },
            },
      },
      async headers() {
            return [
                  {
                        source: '/(.*)',
                        headers: [
                              {
                                    key: 'X-Content-Type-Options',
                                    value: 'nosniff',
                              },
                              {
                                    key: 'X-Frame-Options',
                                    value: 'DENY',
                              },
                              {
                                    key: 'Referrer-Policy',
                                    value: 'strict-origin-when-cross-origin',
                              },
                              {
                                    key: 'Permissions-Policy',
                                    value: 'camera=(self), display-capture=(self)',
                              },
                        ],
                  },
            ];
      },
};

export default nextConfig;

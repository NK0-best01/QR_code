import type { NextConfig } from "next";

const nextConfig: NextConfig = {
      /* config options here */
      allowedDevOrigins: [
            '10.1.60.206',
            '10.1.60.206:3000',
            'localhost',
            'localhost:3000',
            '127.0.0.1',
            '127.0.0.1:3000',
            '*.local',
      ],
      cacheComponents: true,
      partialPrefetching: true,
      turbopack: {
            rules: {
                  "*.css": {
                        loaders: ["@tailwindcss/turbopack"],
                        as: "*.css",
                  },
            },
      },
};

export default nextConfig;

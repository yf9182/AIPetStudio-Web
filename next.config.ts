import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      // Material Hub media is served from Aliyun OSS and its own CDN host.
      { protocol: "https", hostname: "**.aliyuncs.com" },
      { protocol: "https", hostname: "**.material-hub-nano-banana.yangf999212.workers.dev" },
      // Vidu generation results are served from the provider CDN.
      { protocol: "https", hostname: "**.vidu.com" },
      { protocol: "https", hostname: "**.viduapi.com" },
      // Google avatars for signed-in accounts.
      { protocol: "https", hostname: "lh3.googleusercontent.com" }
    ]
  }
};

export default nextConfig;

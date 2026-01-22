import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 启用 standalone 输出模式（Docker 部署推荐）
  output: "standalone",

  // 启用类型化路由（Next.js 16 特性）
  typedRoutes: true,
};

export default nextConfig;

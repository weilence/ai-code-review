# ============================================
# Stage 1: Base
# ============================================
FROM oven/bun:1 AS base
WORKDIR /app

# ============================================
# Stage 2: Install dependencies
# ============================================
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock* /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

# 安装生产依赖
RUN mkdir -p /temp/prod
COPY package.json bun.lock* /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# ============================================
# Stage 3: Build
# ============================================
FROM base AS build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 构建 Next.js 应用
RUN bun run build

# ============================================
# Stage 4: Release
# ============================================
FROM base AS release

# 复制生产依赖
COPY --from=install /temp/prod/node_modules node_modules

# 复制 Next.js standalone 输出
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

# 修复文件权限：将所有复制的文件改为 bun 用户所有
RUN chown -R bun:bun /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 切换到 bun 用户（与 bun 官方镜像一致）
USER bun
# 暴露端口
EXPOSE 3000/tcp

# 启动应用
CMD ["bun", "run", "start"]

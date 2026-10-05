FROM node:22-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps
COPY . .
ARG VITE_APP_URL=""
ENV VITE_APP_URL=$VITE_APP_URL
RUN npm run build && npm prune --omit=dev --legacy-peer-deps

FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/server.ts /app/syncStore.ts /app/aiResult.ts /app/firebase-applet-config.json ./
USER node
EXPOSE 8080
CMD ["node", "server.ts"]

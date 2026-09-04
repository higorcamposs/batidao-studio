FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install -g pnpm@11.6.0 \
  && (pnpm install --no-frozen-lockfile --ignore-scripts || test -x node_modules/.bin/tsc)
COPY . .
RUN pnpm exec tsc -b && pnpm exec vite build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

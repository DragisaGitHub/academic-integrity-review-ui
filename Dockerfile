FROM node:20-alpine AS build

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build

FROM nginx:1.29-alpine AS runtime

COPY nginx.conf /etc/nginx/nginx.conf
COPY docker/40-runtime-config.sh /docker-entrypoint.d/40-runtime-config.sh
COPY --from=build /app/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-runtime-config.sh

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
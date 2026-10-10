FROM node:22-alpine AS development

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY docker-entrypoint.sh /howly-entrypoint.sh
RUN chmod +x /howly-entrypoint.sh

COPY --from=build /app/dist /usr/share/nginx/html

ENV BACKEND_UPSTREAM=http://backend:3000

EXPOSE 80

ENTRYPOINT ["/howly-entrypoint.sh"]

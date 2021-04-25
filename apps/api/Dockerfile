FROM node:lts-alpine
WORKDIR /app
COPY ./dist/ ./
ENV PORT=3334
EXPOSE ${PORT}
COPY package.json package-lock.json ./
RUN npm install --production
CMD node apps/api/main.js
FROM node:20-alpine

WORKDIR /app

COPY package.json ./
COPY index.html styles.css app.js server.mjs ./

RUN mkdir -p data

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4174

EXPOSE 4174

CMD ["node", "server.mjs"]

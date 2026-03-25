FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

RUN mkdir -p /app/database
RUN mkdir -p /app/public/images

CMD ["npm", "start"]

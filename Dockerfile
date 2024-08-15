FROM node:18-alpine
WORKDIR /opt/app
COPY . .

RUN npm install

EXPOSE 3000
CMD [ "npm", "start"]
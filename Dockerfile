FROM node:18-alpine
WORKDIR /opt/app
COPY . .

RUN npm install
# ENV HOST 0.0.0.0
EXPOSE 3000
CMD [ "npm", "start"]
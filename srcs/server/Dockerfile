FROM node:20.3.1

ARG SERVER_PORT

WORKDIR /usr/src/app

RUN npm cache clean --force

COPY . .

EXPOSE ${SERVER_PORT}
ENV PORT=${SERVER_PORT}
RUN npm install
RUN npm run build


CMD [ "npm", "run" ,"start:prod"]


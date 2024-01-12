FROM node:20.3.1

ARG CLIENT_PORT
ARG SERVER_URL

WORKDIR /usr/src/client

RUN npm cache clean --force

COPY . .

EXPOSE ${CLIENT_PORT}
ENV PORT=${CLIENT_PORT}
ENV REACT_APP_SERVER_URL=$SERVER_URL

RUN npm install
RUN npm run build


CMD [ "npm", "run" ,"start" ]

# CMD [ "tail", "-f", "/dev/null" ]

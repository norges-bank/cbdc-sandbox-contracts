FROM node:16-alpine

WORKDIR /usr/src/app
RUN apk add --no-cache python3 make g++ libc6-compat

COPY package*.json ./
RUN npm clean-install --ignore-scripts
COPY . . 

RUN npm run build
RUN npm run test

COPY $PWD/docker/* /usr/local/bin/
ENTRYPOINT ["/bin/sh", "/usr/local/bin/entrypoint.sh"]

FROM node:14.21.3-alpine

ARG SERVICE

WORKDIR /app

COPY ./packages/core-services/package.json packages/core-services/package.json
COPY ./packages/core-services/dist packages/core-services/dist

COPY ./packages/agenda/package.json packages/agenda/package.json
COPY ./packages/agenda/dist packages/agenda/dist

COPY ./packages/core-typings/package.json packages/core-typings/package.json
COPY ./packages/core-typings/dist packages/core-typings/dist

COPY ./packages/rest-typings/package.json packages/rest-typings/package.json
COPY ./packages/rest-typings/dist packages/rest-typings/dist

COPY ./packages/model-typings/package.json packages/model-typings/package.json
COPY ./packages/model-typings/dist packages/model-typings/dist

COPY ./packages/models/package.json packages/models/package.json
COPY ./packages/models/dist packages/models/dist

COPY ./packages/logger/package.json packages/logger/package.json
COPY ./packages/logger/dist packages/logger/dist

COPY ./ee/apps/${SERVICE}/dist .

COPY ./package.json .
COPY ./yarn.lock .
COPY ./.yarnrc.yml .
COPY ./.yarn/plugins .yarn/plugins
COPY ./.yarn/releases .yarn/releases
COPY ./ee/apps/${SERVICE}/package.json ee/apps/${SERVICE}/package.json

ENV NODE_ENV=production \
    PORT=3000

WORKDIR /app/ee/apps/${SERVICE}

RUN apk update && \
    apk --no-cache --virtual build-dependencies add g++ python3 make && \
    yarn workspaces focus --production && \
    rm -rf /var/cache/apk/* && \
    apk del build-dependencies

EXPOSE 3000 9458

CMD ["node", "src/service.js"]

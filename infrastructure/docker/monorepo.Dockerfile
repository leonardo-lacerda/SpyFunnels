FROM node:24-alpine AS base
WORKDIR /app
COPY package.json tsconfig.base.json ./
COPY apps ./apps
COPY services ./services
COPY packages ./packages
COPY scripts ./scripts
COPY migrations ./migrations
RUN npm install

FROM base AS builder
ARG WORKSPACE
RUN npm run build --workspace ${WORKSPACE}

FROM node:24-alpine AS runtime
WORKDIR /app
COPY --from=base /app /app
ARG WORKSPACE
ENV WORKSPACE=${WORKSPACE}
EXPOSE 3000
CMD ["sh", "-c", "npm run start --workspace ${WORKSPACE}"]


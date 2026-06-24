FROM node:24-slim AS app

ARG EVE_AGENT_CONFIG_URL
ENV EVE_AGENT_CONFIG_URL=$EVE_AGENT_CONFIG_URL
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable
WORKDIR /app

COPY . .
RUN node scripts/materialize-agent.mjs --optional
RUN pnpm install --prod=false
RUN pnpm build

ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]

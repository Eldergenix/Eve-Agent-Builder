# Template source apps

These apps are source material for generated project templates.

- `web-chat-next-template` generates `packages/eve/src/setup/scaffold/create/web-template.ts`.
- `eve-agent-deploy-template` is the service-owned one-click deployment template
  used by Agent Builder deploy buttons. Publish this directory as its own public
  Git repository and point `NEXT_PUBLIC_EVE_AGENT_TEMPLATE_REPOSITORY_URL` at
  that repository. The template consumes `EVE_AGENT_CONFIG_URL` before
  install/build where platforms allow it and materializes only the standalone
  agent runtime files, not the builder source.
  For Railway, also publish the template through Railway and set
  `NEXT_PUBLIC_EVE_AGENT_RAILWAY_TEMPLATE_URL` to that marketplace template URL.

Edit the source app first, then run `pnpm --filter eve generate:web-template` to refresh generated scaffold output.

import {createChatSession,readTranscripts} from "../lib/chat-store";
import { handleSettings, isAdmin, type SettingsEnv } from "../lib/agent-settings";
import { handleChat } from "../lib/show-guide";
import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";

export default {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const path = new URL(request.url).pathname;
    if (path === "/api/chat/sessions") return createChatSession(request, env as Cloudflare.Env & SettingsEnv, import.meta.env.DEV);
    if (path === "/api/admin/chats") return readTranscripts(request, env as Cloudflare.Env & SettingsEnv, import.meta.env.DEV);
    if (path === "/api/admin/settings") return handleSettings(request, env as Cloudflare.Env & SettingsEnv, import.meta.env.DEV);
    if ((path === "/admin" || path.startsWith("/admin/")) && !isAdmin(request, env as Cloudflare.Env & SettingsEnv, import.meta.env.DEV)) {
      if (!request.headers.get("oai-authenticated-user-id")) return Response.redirect(new URL("/signin-with-chatgpt?return_to=%2Fadmin", request.url), 302);
      return new Response("Only the site owner can access this admin panel.", {status:403});
    }
    if (path === "/api/chat") return handleChat(request, env as Cloudflare.Env & { OPENAI_API_KEY?: string });
    let binding = ctx.props?.CONNECTORS;
    // Local preview emulates the same request-scoped capability. This branch and
    // the auxiliary service binding are absent from production builds.
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) {
            return { status: "request_context_expired", message: "This request has expired. Please try again." };
          }
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

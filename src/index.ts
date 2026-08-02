/**
 * pepita local MCP server (stdio).
 *
 * Reuses the CLI's auth: it reads the bearer token from ~/.pepita/config.json
 * (run `pepita login` first), or from PEPITA_TOKEN. Exposes the pepita tool
 * surface over stdio so a local Claude (Claude Code / Desktop / Inspector) can
 * drive your sites. This is the local (stdio) server; a hosted remote server is
 * a separate component.
 *
 * Register with, e.g.:
 *   claude mcp add pepita -- npx -y @pepitahq/mcp
 */
import { homedir } from 'node:os';
import { join } from 'node:path';
import { readFileSync } from 'node:fs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { makeClient, registerTools, SERVER_INSTRUCTIONS } from '@pepitahq/mcp-core';
import type { PepitaApi } from '@pepitahq/shared';

/** This binary's version, in ONE place inside the source.
 *
 *  It is both what the MCP server announces to a client and what the API
 *  handshake sends as `X-Pepita-Client: mcp/<version>`, so those two can no
 *  longer disagree with each other.
 *
 *  It CAN still disagree with package.json and server.json, and nothing here
 *  catches that: this package has no test runner. The version lives in four
 *  places in total (package.json, server.json twice, and here) — CLAUDE.md's
 *  release notes list them, and the release flow is the only check.
 *
 *  SINCE 0.12.1 THIS BINARY IS THE FALLBACK, NOT THE FRONT DOOR. `server.json`
 *  declares a `remotes` entry for mcp.pepita.dev ahead of this npm package, so
 *  a registry-driven install lands on the HOSTED server — which ships with its
 *  own deploy and therefore cannot go stale. This file is what a client without
 *  remote-MCP support falls back to, and it is the copy that can drift: it
 *  bundles pepita-api.ts, so its API paths freeze at install time. */
const VERSION = '0.12.1';

const DEFAULT_API_BASE = 'https://app.pepita.dev';

function resolveAuth(): { apiBase: string; token: string } {
  const dir = process.env.PEPITA_CONFIG_DIR ?? join(homedir(), '.pepita');
  let apiBase = process.env.PEPITA_API_BASE ?? DEFAULT_API_BASE;
  let token = process.env.PEPITA_TOKEN ?? '';
  try {
    const cfg = JSON.parse(readFileSync(join(dir, 'config.json'), 'utf-8')) as {
      apiBase?: string;
      token?: string;
    };
    if (!process.env.PEPITA_API_BASE && cfg.apiBase) apiBase = cfg.apiBase;
    if (!token && cfg.token) token = cfg.token;
  } catch {
    // no config file — fall through to the token check
  }
  if (!token) {
    console.error(
      'pepita-mcp: not authorized. Run `pepita login` first (writes ~/.pepita/config.json), or set PEPITA_TOKEN.'
    );
    process.exit(1);
  }
  return { apiBase, token };
}

/**
 * Append a one-line upgrade notice to every tool result once the server has
 * advised one. The CLI prints its equivalent notice on stderr AFTER the run
 * (`noticeUpgrade` in `index.ts`) — this server is long-lived and has no
 * "after the run" moment, so the notice has to ride inside each tool result
 * instead, where the model (and whoever is reading its output) will actually
 * see it. Without this, `client.upgradeAdvised()` was captured on every
 * request and read by nothing: a stale client silently kept reading every
 * form-data source while the response labelled it a single one (I-3 in the
 * 2026-07-28 review), with no visible sign anywhere that the server had
 * already said so.
 *
 * Monkey-patches the one instance's `registerTool`, not the SDK globally.
 * `mcp-core`'s `registerTools` always calls it as `(name, config, handler)` —
 * the 2/4/5-arg overloads belong to the deprecated `.tool()` method, never
 * used here — so wrapping that exact shape is safe without reproducing the
 * SDK's generic tool-config types.
 */
function withUpgradeNotice(server: McpServer, client: PepitaApi): void {
  const original = server.registerTool.bind(server);
  (server as unknown as { registerTool: typeof server.registerTool }).registerTool = ((
    name: string,
    config: unknown,
    handler: (...a: unknown[]) => Promise<{ content: unknown[]; isError?: boolean }>
  ) => {
    const wrapped = async (...a: unknown[]) => {
      const result = await handler(...a);
      const min = client.upgradeAdvised();
      if (!min) return result;
      return {
        ...result,
        content: [
          ...result.content,
          {
            type: 'text',
            text: `pepita-mcp is behind (running ${VERSION}); the server now expects ${min} or newer — update with \`npx -y @pepitahq/mcp\`.`
          }
        ]
      };
    };
    return original(name as never, config as never, wrapped as never);
  }) as typeof server.registerTool;
}

async function main(): Promise<void> {
  const { apiBase, token } = resolveAuth();
  const server = new McpServer(
    { name: 'pepita', version: VERSION },
    { instructions: SERVER_INSTRUCTIONS }
  );
  // `clientId` identifies THIS published binary so the server can advise an
  // upgrade when the API has moved past it. The remote worker deliberately
  // passes none: it always ships with its own deploy, so it cannot be stale.
  const client = makeClient({ apiBase, token, clientId: `mcp/${VERSION}` });
  withUpgradeNotice(server, client);
  registerTools(server, client);
  await server.connect(new StdioServerTransport());
  // stdio transport keeps the process alive until the client disconnects.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

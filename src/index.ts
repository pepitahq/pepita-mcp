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

/** This binary's version, in ONE place inside the source.
 *
 *  It is both what the MCP server announces to a client and what the API
 *  handshake sends as `X-Pepita-Client: mcp/<version>`, so those two can no
 *  longer disagree with each other.
 *
 *  It CAN still disagree with package.json and server.json, and nothing here
 *  catches that: this package has no test runner. The version lives in four
 *  places in total (package.json, server.json twice, and here) — CLAUDE.md's
 *  release notes list them, and the release flow is the only check. */
const VERSION = '0.10.0';

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

async function main(): Promise<void> {
  const { apiBase, token } = resolveAuth();
  const server = new McpServer(
    { name: 'pepita', version: VERSION },
    { instructions: SERVER_INSTRUCTIONS }
  );
  // `clientId` identifies THIS published binary so the server can advise an
  // upgrade when the API has moved past it. The remote worker deliberately
  // passes none: it always ships with its own deploy, so it cannot be stale.
  registerTools(server, makeClient({ apiBase, token, clientId: `mcp/${VERSION}` }));
  await server.connect(new StdioServerTransport());
  // stdio transport keeps the process alive until the client disconnects.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

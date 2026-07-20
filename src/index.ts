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
    { name: 'pepita', version: '0.5.1' },
    { instructions: SERVER_INSTRUCTIONS }
  );
  registerTools(server, makeClient({ apiBase, token }));
  await server.connect(new StdioServerTransport());
  // stdio transport keeps the process alive until the client disconnects.
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

> **Snapshot.** Factored out of the private pepita monorepo, built and released from there,
> and **not standalone-buildable**. PRs are applied in the monorepo. https://pepita.dev

# @pepitahq/mcp

Local [MCP](https://modelcontextprotocol.io) server (stdio) for [pepita](https://pepita.dev)
sites. Lets a local Claude (Claude Code / Desktop / the MCP Inspector) read and
edit your sites, publish them, and manage shareable preview links — the same
things you can do in the editor. Edits show up live in the pepita editor too, so
you can move between the chat and the visual editor mid-task.

> **Prefer the hosted connector?** There's a remote, OAuth-authenticated connector
> at `https://mcp.pepita.dev/mcp` — nothing to install, just sign in with your
> pepita account:
> ```bash
> claude mcp add --transport http pepita https://mcp.pepita.dev/mcp
> ```
> (or add it as a custom connector in Claude Desktop / claude.ai). This package is
> the **local** alternative — it runs on your machine and works with any MCP client.

Authentication reuses the pepita CLI: run `pepita login` first (writes
`~/.pepita/config.json`), or set `PEPITA_TOKEN`. No separate OAuth.

## Use

```bash
# one-off, no install:
npx @pepitahq/mcp

# register the local server in Claude Code:
claude mcp add pepita-local -- npx -y @pepitahq/mcp
```

## Tools

Ten tools — five that read your sites, five that write, publish, or manage previews:

- **Read** — `list_sites`, `get_status`, `list_site_files`, `read_site_file`, `list_previews`
- **Write** — `write_site_file` (into the working copy), `publish` (→ live), and preview
  links: `create_preview`, `update_preview` (push the current site onto an existing
  link), `delete_preview`

`list_site_files` / `read_site_file` read the working copy by default, the live
site (`state: "live"`), or a specific preview link (`preview: "<name>"`).

Destructive / account-level actions (custom domains, team, billing, deleting a
site) are deliberately not exposed — those stay in the editor UI, where their
confirmations live. (Deleting a preview link is exposed: it only stops serving,
and the version stays restorable from History.)

## Env

- `PEPITA_TOKEN` — bearer token (overrides the config file).
- `PEPITA_API_BASE` — API host (default `https://app.pepita.dev`).
- `PEPITA_CONFIG_DIR` — config dir (default `~/.pepita`).

> **Snapshot.** Factored out of the private pepita monorepo, built and released from there,
> and **not standalone-buildable**. PRs are applied in the monorepo. https://pepita.dev

# @pepitahq/mcp

Local [MCP](https://modelcontextprotocol.io) server (stdio) for [pepita](https://pepita.dev)
sites. Lets a local Claude (Claude Code / Desktop / the MCP Inspector) read and
edit your sites, publish them, and manage shareable preview links — the same
things you can do in the editor.

Authentication reuses the pepita CLI: run `pepita login` first (writes
`~/.pepita/config.json`), or set `PEPITA_TOKEN`. No separate OAuth.

## Use

```bash
# one-off, no install:
npx @pepitahq/mcp

# register in Claude Code:
claude mcp add pepita -- npx -y @pepitahq/mcp
```

## Tools

`list_sites`, `get_status`, `list_files`, `read_file`, `write_file` (into the
working copy), `publish` (→ live), and preview links: `create_preview`,
`list_previews`, `update_preview` (push the current site onto an existing
link), `delete_preview`.

Destructive / account-level actions (custom domains, team, billing, deleting a
site) are deliberately not exposed — those stay in the editor UI. (Deleting a
preview link is exposed: it only stops serving, and the version stays
restorable from History.)

## Env

- `PEPITA_TOKEN` — bearer token (overrides the config file).
- `PEPITA_API_BASE` — API host (default `https://app.pepita.dev`).
- `PEPITA_CONFIG_DIR` — config dir (default `~/.pepita`).

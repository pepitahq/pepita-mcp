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

Also listed in the [MCP Registry](https://registry.modelcontextprotocol.io) as
`dev.pepita.mcp/mcp`. If your MCP client can browse the registry, find **pepita**
there and add it in one step; otherwise use the `npx` / `claude mcp add` setup above
(the registry entry points at the same `@pepitahq/mcp` package).

## Tools

Twenty-six tools — six that read your sites, six that write, publish, or manage
previews, three that manage video assets, one that teaches the model pepita's
platform contracts, five that manage confirmation-email templates, two for the
images inside one, and three that read or export what visitors submitted through
your forms:

- **Read** — `list_sites`, `get_status`, `list_site_files`, `read_site_file`, `list_previews`,
  `list_video_assets`
- **Write** — `create_site` (a brand-new site, live immediately with starter content),
  `write_site_file` (into the working copy), `publish` (→ live), and preview
  links: `create_preview`, `update_preview` (push the current site onto an existing
  link), `delete_preview`
- **Assets** — `rename_asset` (display label only — the id and URLs never change, so
  pages referencing the asset keep working), `get_video_asset_original_url` (an
  expiring download link for the uploaded original), `delete_video_asset` (removes
  the asset and stops its streams)
- **Guide** — `get_building_guide` (the platform contract for a topic — `overview`,
  `forms`, `confirmation-emails`, `video`, `headers-and-csp` — read before writing
  any of them)
- **Email templates** — `list_email_templates`, `read_email_template` (envelope +
  body), `write_email_template` (upsert by form name; updating an existing
  template changes the WORKING COPY only, a brand-new one is saved as it is
  created), `save_email_template` (makes the working copy the version people
  receive — the same act as the editor's Save button on the template's row),
  `delete_email_template` (confirmation emails for that form stop immediately)
- **Template images** — `list_email_template_images` (what a template holds, each
  with the public URL to reference in an `<img src>`), `delete_email_template_image`
  (by that name — if the body still references it, the picture breaks in the next
  email that goes out). There is **no upload tool**: an assistant has no practical
  way to hand over image bytes, so uploading is yours to do with the CLI
  (`pepita template image add`) or in the editor's Files tab
- **Form submissions** — `get_form_records_count` (every form that has received a
  submission, with how many it holds — counts cover every source together),
  `get_form_records` (one form's submissions, newest first; reads the editor
  preview's own test submissions by default, `live: true` for the published
  site, `preview: "<name>"` for one preview link. Over 100 matching records it
  returns the COUNT instead, so the assistant can ask before filling your screen
  — `confirm_large: true` then returns them all. A form holds at most 1000
  entries in total, and one whose entries carry more than 50 different field
  names can only be read as a file), `get_form_export_url` (a link to download
  one form's submissions as `xlsx`, `csv` or `json` — same source selection and
  the same editor-preview default as `get_form_records`, so the two tools never
  disagree about which rows they mean; the link expires in 15 minutes)

`list_site_files` / `read_site_file` read the working copy by default, the live
site (`state: "live"`), or a specific preview link (`preview: "<name>"`).

Destructive / account-level actions (custom domains, team, billing, deleting a
site) are deliberately not exposed — those stay in the editor UI, where their
confirmations live. Creating a site IS exposed (it destroys nothing); deleting
one is not. (Deleting a preview link is exposed: it only stops serving, and the
version stays restorable from History.)

pepita sites come with forms, confirmation emails, video and analytics built
in — the server's instructions tell the model to offer them and to call
`get_building_guide` before writing any of their file contracts.

If the server has moved past this package's version, every tool result carries
one extra line naming the newer minimum and the command to update. The CLI
prints its equivalent on stderr once the command finishes; a server is
long-lived and has no "after the run" moment, so the notice rides inside each
result instead. It is a notice, never a block — nothing stops working because
of it. The hosted connector never shows it: it ships with its own deploy, so it
cannot be behind.

## Env

- `PEPITA_TOKEN` — bearer token (overrides the config file).
- `PEPITA_API_BASE` — API host (default `https://app.pepita.dev`).
- `PEPITA_CONFIG_DIR` — config dir (default `~/.pepita`).

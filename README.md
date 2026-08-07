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

Thirty-five tools — six that read your sites, six that write, publish, or manage
previews, three for video, one that teaches the model pepita's platform contracts,
five that manage confirmation-email templates, two for the images inside one, three
that read or export what visitors submitted through your forms, and nine for
repeating content collections:

- **Read** — `list_sites`, `get_site_status`, `list_site_files`, `read_site_file`,
  `list_previews`, `list_videos`
- **Write** — `create_site` (a brand-new site, live immediately with starter content),
  `write_site_file` (into the working copy), `publish_site` (→ live), and preview
  links: `create_preview`, `update_preview` (push the current site onto an existing
  link), `delete_preview`
- **Video** — `rename_video` (display label only — the id and URLs never change, so
  pages referencing the video keep working), `get_video_original_url` (an
  expiring download link for the uploaded original), `delete_video` (removes
  the video and stops its streams)
- **Guide** — `get_building_guide` (the platform contract for a topic — `overview`,
  `forms`, `confirmation-emails`, `video`, `headers-and-csp`, `dynamic-content` —
  read before writing any of them)
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
  (`pepita email template image add`) or in the editor's Forms tab
- **Form submissions** — `get_form_records_count` (every form that has received a
  submission, with how many it holds — counts cover every source together),
  `list_form_records` (one form's submissions, newest first; reads the editor
  preview's own test submissions by default, `live: true` for the published
  site, `preview: "<name>"` for one preview link. Over 100 matching records it
  returns the COUNT instead, so the assistant can ask before filling your screen
  — `confirm_large: true` then returns them all. A form holds at most 1000
  entries in total, and one whose entries carry more than 50 different field
  names can only be read as a file), `get_form_export_url` (a link to download
  one form's submissions as `xlsx`, `csv` or `json` — same source selection and
  the same editor-preview default as `list_form_records`, so the two tools never
  disagree about which rows they mean; the link expires in 15 minutes)
- **Content collections** — repeating structured content: a blog, a menu, a team
  page. Two halves, and they are separate tools. The SHAPE:
  `list_content_templates`, `read_content_template` (the complete HTML document for
  ONE item — keep its `<head>` and `<style>`, only the head's first `<style>`
  survives into the page), `write_content_template` (a brand-new one is saved as it
  is created; changing an existing one writes the working copy until
  `save_content_template`), `save_content_template`, `delete_content_template` (the
  items survive — writing a template with the same name again brings them back).
  The ITEMS: `list_content_records`, `add_content_records` (an ARRAY, so many in one
  call — all of them land or none do, and a refusal names every bad item by its
  position), `update_content_record` (the WHOLE item, not a patch),
  `delete_content_record`.

  Three things to know. **The name is the pairing** — a page shows a collection
  through `<pepita-content mode="list" name="blog">`, which is an ordinary site
  file you write with `write_site_file`, and the name must match the template's or
  the page renders the static markup inside the tag and nothing else, with no error
  anywhere. **Every item needs a `title`** — it is what the item's web address is
  made from, and pepita mints the last few characters itself, so never invent an
  address. And **a new item is a draft**: it shows in the editor and on preview links, and reaches the live site only when published. There is no site-wide publish
  step, unlike every other write here.

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

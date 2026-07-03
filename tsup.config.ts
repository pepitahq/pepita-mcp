import { defineConfig } from 'tsup';

// Bundle the local MCP server into a single self-contained dist/index.js. The
// INTERNAL workspace packages (@pepitahq/*) are inlined (tree-shaken + minified)
// so they never publish as their own packages. Third-party deps
// (@modelcontextprotocol/sdk, zod) stay external (declared in dependencies).
export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node18',
  minify: true,
  treeshake: true,
  clean: true,
  dts: false,
  noExternal: [/^@pepitahq\//],
  banner: { js: '#!/usr/bin/env node' }
});

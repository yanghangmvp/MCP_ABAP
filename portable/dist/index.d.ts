/**
 * Package entry point → compiles to `dist/index.js`.
 *
 * This is the file referenced by package.json `main`/`types`/`exports["."]`
 * and by any tooling that launches `node dist/index.js` (e.g. the dev repo's
 * `.vscode/launch.json`). Historically it did not exist — there was no
 * `src/index.ts`, so the build never produced `dist/index.js`, and both a
 * package import and `node dist/index.js` failed with MODULE_NOT_FOUND. The
 * only runnable entry was `bin/mcp-abap-adt.js` (which requires
 * `dist/server/launcher.js`).
 *
 * Dual purpose:
 *  - Imported as a LIBRARY (`import { … } from '@mcp-abap-adt/core'`): re-exports
 *    the public server API with NO side effects.
 *  - Executed DIRECTLY (`node dist/index.js …`): boots the MCP server, identical
 *    to `bin/mcp-abap-adt.js`. Importing `./server/launcher` has the side effect
 *    of starting the server, so it is pulled in ONLY when this file is the entry
 *    module — a plain library import never starts a server.
 */
export * from './server/index.js';
//# sourceMappingURL=index.d.ts.map
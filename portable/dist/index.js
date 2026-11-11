"use strict";
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./server/index.js"), exports);
// Boot the server only when run as the entry module (not on library import).
if (require.main === module) {
    // Side-effect import: requiring the launcher starts the MCP server, reading
    // its options from process.argv (same as bin/mcp-abap-adt.js).
    require('./server/launcher.js');
}
//# sourceMappingURL=index.js.map
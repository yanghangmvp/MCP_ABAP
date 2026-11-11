/**
 * Example usage of handler registration system with Dependency Injection
 *
 * This example demonstrates how to use handler groups to create different
 * server configurations with different sets of handlers.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { HandlerContext } from '../../../handlers/interfaces.js';
/**
 * Example 1: Read-only server (e.g., for public API)
 * Only registers read-only handlers, system handlers, and search handlers
 */
export declare function createReadOnlyServer(context: HandlerContext): McpServer;
/**
 * Example 2: Full-featured server
 * Registers all handler groups
 */
export declare function createFullServer(context: HandlerContext): McpServer;
/**
 * Example 3: Dynamic handler group management
 * Add/remove handler groups at runtime
 */
export declare function createDynamicServer(context: HandlerContext): McpServer;
/**
 * Example 4: Custom server configuration
 * Create a server with only specific handler groups
 */
export declare function createCustomServer(includeReadOnly: boolean | undefined, context: HandlerContext): McpServer;
//# sourceMappingURL=usage-example.d.ts.map
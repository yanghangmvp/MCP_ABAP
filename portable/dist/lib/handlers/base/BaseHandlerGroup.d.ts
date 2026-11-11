import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { HandlerContext } from '../../../handlers/interfaces.js';
import type { HandlerEntry, IHandlerGroup, ToolHandler } from '../interfaces.js';
/**
 * Base class for handler groups
 * Provides common functionality for registering handlers
 */
export declare abstract class BaseHandlerGroup implements IHandlerGroup {
    protected abstract groupName: string;
    protected context: HandlerContext;
    constructor(context: HandlerContext);
    /**
     * Gets the name of the handler group
     */
    getName(): string;
    /**
     * Gets all handler entries in this group
     * Must be implemented by subclasses
     */
    abstract getHandlers(): HandlerEntry[];
    /**
     * Registers all handlers from this group on the MCP server
     */
    registerHandlers(server: McpServer): void;
    /**
     * Helper function to register a tool on McpServer
     * Wraps handler to convert our response format to MCP format
     */
    protected registerToolOnServer(server: McpServer, toolName: string, description: string, inputSchema: any, handler: ToolHandler): void;
}
//# sourceMappingURL=BaseHandlerGroup.d.ts.map
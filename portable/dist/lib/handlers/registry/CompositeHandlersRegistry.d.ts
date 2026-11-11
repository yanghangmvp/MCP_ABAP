import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IHandlerGroup, IHandlersRegistry, ToolDefinition, ToolHandler } from '../interfaces.js';
/**
 * Composite handlers registry that accepts multiple handler groups via Dependency Injection
 * Allows flexible composition of handler sets based on requirements
 */
export declare class CompositeHandlersRegistry implements IHandlersRegistry {
    private registeredTools;
    private handlerGroups;
    private readonly failOnDuplicate;
    /**
     * Creates a composite registry with the specified handler groups
     * @param handlerGroups - Array of handler groups to register
     * @param failOnDuplicate - When true, throws on duplicate tool names (useful in dev)
     */
    constructor(handlerGroups?: IHandlerGroup[], failOnDuplicate?: boolean);
    /**
     * Adds a handler group to the registry
     * @param group - Handler group to add
     */
    addHandlerGroup(group: IHandlerGroup): void;
    /**
     * Removes a handler group from the registry
     * @param groupName - Name of the group to remove
     */
    removeHandlerGroup(groupName: string): void;
    /**
     * Gets all handler groups in this registry
     */
    getHandlerGroups(): IHandlerGroup[];
    /**
     * Registers all tools from all handler groups on MCP server
     */
    registerAllTools(server: McpServer): void;
    /**
     * Registers a single tool on server
     * Note: This method is provided for compatibility, but it's recommended to use handler groups
     */
    registerTool(server: McpServer, toolName: string, toolDefinition: ToolDefinition, handler: ToolHandler): void;
    /**
     * Gets list of registered tools
     */
    getRegisteredTools(): string[];
    /**
     * Gets list of handler group names
     */
    getHandlerGroupNames(): string[];
}
//# sourceMappingURL=CompositeHandlersRegistry.d.ts.map
#!/usr/bin/env node
// Species 8 — MCP Server
// Separate entry point for Claude Code tool integration.
// Exposes mutation tools over stdio transport.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"

import * as mutateTool from "./tools/mutate.js"
import * as getStatusTool from "./tools/get_status.js"
import * as listMutationsTool from "./tools/list_mutations.js"
import * as uploadAudioTool from "./tools/upload_audio.js"

const server = new McpServer({
  name: "species8",
  version: "0.1.0",
})

// Shared state — in-process job store (MCP server is long-lived)
const state = {
  jobs: new Map(),
  files: new Map(),
  nextJobId: 1,
  serverUrl: process.env.SPECIES8_SERVER_URL || "http://localhost:4000",
}

// Register tools
mutateTool.register(server, state)
getStatusTool.register(server, state)
listMutationsTool.register(server, state)
uploadAudioTool.register(server, state)

// Start
const transport = new StdioServerTransport()
await server.connect(transport)

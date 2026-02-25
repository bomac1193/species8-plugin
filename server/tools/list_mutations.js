// Species 8 MCP Tool — list_mutations
// List recent mutations with status.

import { z } from "zod"

export function register(server, state) {
  server.tool(
    "list_mutations",
    "List recent mutations with their status, prompts, and preview URLs.",
    {
      limit: z.number().optional().default(10).describe("Maximum number of mutations to return (default: 10)"),
    },
    async ({ limit }) => {
      try {
        const response = await fetch(`${state.serverUrl}/mutations`)

        if (!response.ok) {
          return { content: [{ type: "text", text: `Server error: ${response.status}` }] }
        }

        const mutations = await response.json()
        const recent = mutations.slice(-limit).reverse()

        const summary = recent.map((job) => ({
          id: job.id,
          status: job.status,
          prompt: job.prompt,
          preview_url: job.previewUrl ? `${state.serverUrl}${job.previewUrl}` : null,
          has_ai_interpretation: !!job.interpretation,
          created_at: job.createdAt,
        }))

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              total: mutations.length,
              showing: summary.length,
              mutations: summary,
            }, null, 2),
          }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to reach server: ${error.message}` }],
        }
      }
    }
  )
}

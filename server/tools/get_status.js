// Species 8 MCP Tool — get_status
// Check mutation status by job ID. Returns full job details + AI interpretation.

import { z } from "zod"

export function register(server, state) {
  server.tool(
    "get_status",
    "Check the status of a mutation job by ID. Returns status, preview URL, and AI interpretation details if available.",
    {
      job_id: z.string().describe("The mutation job ID (e.g. 'mut-1234567890')"),
    },
    async ({ job_id }) => {
      try {
        const response = await fetch(`${state.serverUrl}/mutations/${job_id}`)

        if (!response.ok) {
          if (response.status === 404) {
            return { content: [{ type: "text", text: `Job "${job_id}" not found.` }] }
          }
          return { content: [{ type: "text", text: `Server error: ${response.status}` }] }
        }

        const job = await response.json()

        const result = {
          id: job.id,
          status: job.status,
          prompt: job.prompt,
          preview_url: job.previewUrl ? `${state.serverUrl}${job.previewUrl}` : null,
          error: job.error ?? null,
        }

        if (job.interpretation) {
          result.interpretation = {
            mood: job.interpretation.mood,
            reasoning: job.interpretation.reasoning,
            confidence: job.interpretation.confidence,
            filters: job.interpretation.filters?.map((f) => ({
              effect: f.type,
              reasoning: f.reasoning,
            })),
          }
        }

        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Failed to reach server: ${error.message}` }],
        }
      }
    }
  )
}

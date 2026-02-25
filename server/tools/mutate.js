// Species 8 MCP Tool — mutate
// Queue a mutation with a creative prompt + optional file path.

import { z } from "zod"

export function register(server, state) {
  server.tool(
    "mutate",
    "Queue a sound mutation with a creative text prompt. Optionally reference uploaded audio files. Returns a job ID for tracking.",
    {
      prompt: z.string().describe("Creative text prompt describing the desired mutation, e.g. 'make it sound like a dying satellite transmission' or 'polyrhythmic 3 against 5 with euclidean stutter'"),
      file_id: z.string().optional().describe("Optional file ID from upload_audio tool"),
    },
    async ({ prompt, file_id }) => {
      try {
        const body = {
          prompt,
          settings: {},
        }

        if (file_id) {
          body.settings.references = [file_id]
        }

        const response = await fetch(`${state.serverUrl}/mutate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          const text = await response.text()
          return { content: [{ type: "text", text: `Mutation failed (${response.status}): ${text}` }] }
        }

        const job = await response.json()

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              job_id: job.id,
              status: job.status,
              prompt: job.prompt,
              message: `Mutation queued. Use get_status with ID "${job.id}" to check progress.`,
            }, null, 2),
          }],
        }
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Failed to reach Species 8 server at ${state.serverUrl}: ${error.message}. Is the server running?`,
          }],
        }
      }
    }
  )
}

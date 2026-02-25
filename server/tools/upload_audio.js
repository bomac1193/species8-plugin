// Species 8 MCP Tool — upload_audio
// Register a local audio file path for mutation.

import { z } from "zod"
import fs from "fs"
import path from "path"

export function register(server, state) {
  server.tool(
    "upload_audio",
    "Upload a local audio file to the Species 8 server for use as a mutation reference. Supports WAV, AIFF, MP3, FLAC, OGG.",
    {
      file_path: z.string().describe("Absolute path to the audio file on disk"),
    },
    async ({ file_path: filePath }) => {
      // Validate file exists
      if (!fs.existsSync(filePath)) {
        return { content: [{ type: "text", text: `File not found: ${filePath}` }] }
      }

      const ext = path.extname(filePath).toLowerCase()
      const allowed = [".wav", ".aiff", ".aif", ".mp3", ".flac", ".ogg"]
      if (!allowed.includes(ext)) {
        return { content: [{ type: "text", text: `Unsupported format "${ext}". Supported: ${allowed.join(", ")}` }] }
      }

      try {
        // Read file and upload via multipart form
        const fileBuffer = fs.readFileSync(filePath)
        const fileName = path.basename(filePath)

        const formData = new FormData()
        const blob = new Blob([fileBuffer], { type: `audio/${ext.slice(1)}` })
        formData.append("audio", blob, fileName)

        const response = await fetch(`${state.serverUrl}/uploads`, {
          method: "POST",
          body: formData,
        })

        if (!response.ok) {
          const text = await response.text()
          return { content: [{ type: "text", text: `Upload failed (${response.status}): ${text}` }] }
        }

        const result = await response.json()

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              file_id: result.id,
              name: result.name,
              size_bytes: result.size,
              message: `File uploaded. Use file_id "${result.id}" with the mutate tool.`,
            }, null, 2),
          }],
        }
      } catch (error) {
        return {
          content: [{ type: "text", text: `Upload failed: ${error.message}` }],
        }
      }
    }
  )
}

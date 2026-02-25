// Species 8 — Python Effects Runner
// Thin subprocess wrapper for Python DSP scripts.
// Contract: python3 <script> <input.wav> <output.wav> '<json_params>'

import { spawn } from "child_process"
import path from "path"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EFFECTS_DIR = path.join(__dirname, "effects")
const TIMEOUT_MS = 30_000

/**
 * Run a Python effect script.
 * @param {string} scriptName - e.g. "spectral_freeze.py"
 * @param {string} inputPath  - absolute path to input WAV
 * @param {string} outputPath - absolute path to write output WAV
 * @param {object} params     - effect parameters (passed as JSON string)
 * @returns {Promise<void>} resolves on success, rejects on error/timeout
 */
export function runPythonEffect(scriptName, inputPath, outputPath, params = {}) {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(EFFECTS_DIR, scriptName)
    const paramsJson = JSON.stringify(params)

    const proc = spawn("python3", [scriptPath, inputPath, outputPath, paramsJson], {
      timeout: TIMEOUT_MS,
      stdio: ["ignore", "pipe", "pipe"],
    })

    let stderr = ""

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString()
    })

    proc.on("error", (error) => {
      reject(new Error(`Python effect "${scriptName}" spawn error: ${error.message}`))
    })

    proc.on("close", (code) => {
      if (code === 0) {
        resolve()
      } else {
        reject(new Error(`Python effect "${scriptName}" exited with code ${code}: ${stderr.slice(0, 500)}`))
      }
    })
  })
}

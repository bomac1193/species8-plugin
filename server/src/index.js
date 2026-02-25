import express from "express"
import fs from "fs"
import morgan from "morgan"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { WebSocketServer } from "ws"
import DspBridge from "./dspBridge.js"
import PromptBrain from "./promptBrain.js"

const app = express()
app.use(express.json({ limit: "10mb" }))
app.use(morgan("dev"))
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", req.headers.origin || "*")
  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type")
  if (req.method === "OPTIONS") return res.sendStatus(200)
  next()
})

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const uploadDir = path.join(__dirname, "..", "uploads")
fs.mkdirSync(uploadDir, { recursive: true })

const uploads = new Map()

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1_000_000)
    const ext = path.extname(file.originalname) || ".wav"
    cb(null, `ref-${timestamp}-${random}${ext}`)
  },
})

const upload = multer({ storage })

const apiKey = process.env.ANTHROPIC_API_KEY
let promptBrain = null
if (apiKey) {
  promptBrain = new PromptBrain(apiKey)
  console.log("AI interpretation enabled (Claude Haiku)")
} else {
  console.warn("ANTHROPIC_API_KEY not set — AI interpretation disabled, using keyword fallback")
}

const dsp = new DspBridge((id) => uploads.get(id), promptBrain)

app.get("/health", (req, res) => {
  res.json({ status: "ok", bridge: "connected" })
})

app.get("/mutations", (req, res) => {
  res.json(dsp.getRecentMutations())
})

app.get("/mutations/:id", (req, res) => {
  const job = dsp.getJobById(req.params.id)
  if (!job) {
    return res.status(404).json({ error: "Mutation not found" })
  }
  res.json(job)
})

app.post("/mutate", (req, res) => {
  const { prompt, settings } = req.body ?? {}

  if (!prompt || typeof prompt !== "string") {
    return res.status(400).json({ error: "Prompt text is required" })
  }

  const mutation = dsp.enqueueMutation({
    prompt,
    settings: settings ?? {},
  })

  broadcast({ type: "mutationQueued", payload: mutation })
  res.json(mutation)
})

app.get("/preview/waveform", (req, res) => {
  res.json(dsp.getWaveformPreview())
})

app.post("/uploads", upload.single("audio"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No audio file provided" })
  }
  uploads.set(req.file.filename, {
    path: req.file.path,
    name: req.file.originalname,
    size: req.file.size,
    mimeType: req.file.mimetype,
  })
  res.json({ id: req.file.filename, name: req.file.originalname, size: req.file.size })
})

app.get("/previews/:id.wav", (req, res) => {
  const buffer = dsp.getPreviewBuffer(req.params.id)
  if (!buffer) {
    return res.status(404).json({ error: "Preview not ready" })
  }
  res.setHeader("Content-Type", "audio/wav")
  res.setHeader("Cache-Control", "no-store")
  res.send(buffer)
})

const server = app.listen(process.env.PORT || 4000, () => {
  console.log(`Species 8 server listening on :${server.address().port}`)
})

const wss = new WebSocketServer({ server })

function broadcast(message) {
  const data = JSON.stringify(message)
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(data)
    }
  })
}

dsp.on("mutation:queued", (job) => broadcast({ type: "mutationQueued", payload: job }))
dsp.on("mutation:rendering", (job) => broadcast({ type: "mutationRendering", payload: job }))
dsp.on("mutation:ready", (job) => broadcast({ type: "mutationReady", payload: job }))
dsp.on("mutation:error", (job) => broadcast({ type: "mutationError", payload: job }))

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "hello",
      payload: { mutations: dsp.getRecentMutations(10) },
    }),
  )
})

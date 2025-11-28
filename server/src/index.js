import express from "express"
import morgan from "morgan"
import { WebSocketServer } from "ws"
import DspBridge from "./dspBridge.js"

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

const dsp = new DspBridge()

app.get("/health", (req, res) => {
  res.json({ status: "ok", bridge: "connected" })
})

app.get("/mutations", (req, res) => {
  res.json(dsp.getRecentMutations())
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

wss.on("connection", (socket) => {
  socket.send(
    JSON.stringify({
      type: "hello",
      payload: { mutations: dsp.getRecentMutations(10) },
    }),
  )
})

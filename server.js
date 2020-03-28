/**
 * Create a video from individual image frames coming from a client.
 *
 * This is the server.
 */
const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')

const { CanvasVideo } = require('./CanvasVideo')

const config = {
  outputDir: 'output',
  port: 7000
}

const handleWebSocketClientConnection = function (ws) {
  const clientId = uuidv4()

  console.log(`[🛰 ] ${clientId}: New client connection`)

  const vid = new CanvasVideo(clientId, config)

  ws.on('message', vid.storeFrame)

  ws.on('close', () => {
    console.log(`[💀] ${clientId}: End client connection`)
    vid.createVideo()
  })
}

// WebSocket server
const wss = new WebSocket.Server({ port: config.port })
console.log('[📡] Started WebSocket server')

wss.on('connection', handleWebSocketClientConnection)

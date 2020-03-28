/**
 * Create a video from individual image frames coming from a client.
 *
 * This is the server.
 */
const WebSocket = require('ws')
const { CanvasVideo } = require('./CanvasVideo')

const config = {
  outputDir: 'output',
  port: 7000
}

// WebSocket server
const wss = new WebSocket.Server({ port: config.port })
console.log('[📡] Started WebSocket server')
wss.on('connection', ws => new CanvasVideo(ws, config))

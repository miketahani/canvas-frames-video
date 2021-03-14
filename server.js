/**
 * Create a video from individual image frames coming from a client.
 *
 * This is the server.
 */
const path = require('path')

const WebSocket = require('ws')
const { v4: uuidv4 } = require('uuid')

const { CanvasVideo } = require('./CanvasVideo')

const config = {
  outputDir: path.join(__dirname, 'output'),
  port: 7000
}

const Status = {
  Receiving: 'RECEIVING',
  Done: 'DONE'
}

const handleWebSocketClientConnection = function (ws) {
  const clientId = uuidv4()
  let status = Status.Receiving

  console.log(`[🛰 ] ${clientId}: New client connection`)

  const vid = new CanvasVideo(clientId, config.outputDir)

  ws.on('message', msg => {
    if (msg === Status.Done) {
      console.log(`[💀] ${clientId}: Done. Creating video.`)
      status = Status.Done
      vid.createVideo()
      return
    }
    vid.storeFrame(msg)
  })

  ws.on('close', () => {
    console.log(`[💀] ${clientId}: End client connection`)

    // Only create the video if we didn't get an explicit "done" message before
    //  (i.e., we haven't created the video)
    if (status !== Status.Done) vid.createVideo()
  })
}

// WebSocket server
const wss = new WebSocket.Server({ port: config.port })
console.log('[📡] Started WebSocket server')

wss.on('connection', handleWebSocketClientConnection)

/**
 * Create a video from individual image frames coming from a client.
 *
 * This is the interface for receiving frame data from clients, storing
 * intermediate images to disk, converting images to video, and doing cleanup.
 *
 * Client socket messages (individual frames) are strings composed of a unique,
 * sequential numeric ID (like a timestamp, frame index, etc), concatenated with
 * a base64-encoded image/png string that represents a single frame. Each frame
 * is saved to disk using the provided sequential ID. When the user has finished
 * capture, the images are ordered and renamed to a ffmpeg-friendly, numeric
 * sequence based on the original sequential frame ID, so they can be
 * converted to video easily. The images are then converted to a video and
 * deleted.
 *
 * We /could/ pipe a frame data stream directly into ffmpeg (see
 * https://github.com/fluent-ffmpeg/node-fluent-ffmpeg/issues/546#issuecomment-222615716),
 * but it's probably best to keep the intermediate frames on disk before the
 * video is created (in case of network error, for generating thumbnails, etc).
 *
 * To send frames:
 * ```
 * let frameIndex = 0
 * function render () {
 *   // ...render logic...
 *   const frame = canvas.toDataURL('image/png')
 *   websocketClient.send((frameIndex++) + frame) // or `Date.now() + frame`, etc
 * }
 * ```
 */


const fs = require('fs').promises
const path = require('path')
const { spawn } = require('child_process')
const { v4: uuidv4 } = require('uuid')

/**
 * Async util to wait for a process to finish before resolving with its output.
 * @param  {ChildProcess.spawn} ps  Process object
 * @return {Promise}                Promise that resolves when the process exits
 */
const waitForProcess = async function (ps) {
  return new Promise((resolve, reject) => {
    let data = ''
    ps.stdout.on('data', incoming => data += incoming.toString())
    ps.on('exit', () => resolve(data))
    ps.on('error', reject)
  })
}

class CanvasVideo {
  constructor (clientWebSocket, config) {
    if (!config) {
      throw 'Missing a config!'
    }

    this.clientId = null
    this.sessionDir = null

    this.ws = clientWebSocket
    this.init(clientWebSocket, config)
  }

  async init (ws, config) {
    const outputDirPath = path.join(__dirname, config.outputDir)

    this.clientId = uuidv4()
    this.sessionDir = path.join(outputDirPath, this.clientId)

    console.log(`[🛰 ] ${this.clientId}: New client connection`)

    // Create image output directory
    await fs.mkdir(this.sessionDir, { recursive: true })

    ws.on('message', msg => this.writeFrameToFile(msg))
    ws.on('close', () => {
      (async () => {
        console.log(`[💀] ${this.clientId}: End client connection`)

        const videoOutputPath = path.join(outputDirPath, `${this.clientId}.mp4`)

        await this.sortFrameFiles()
        await this.convertFramesToVideo(videoOutputPath)
        await this.deleteFrames()
      })()
    })
  }

  /**
   * Write a frame to a file.
   * @param  {String} msg  Some sequential key (generated in client for
   *                       identifying frames in correct order), joined with the
   *                       base64-encoded image/png string.
   */
  async writeFrameToFile (msg) {
    /**
     * A sequential key is concatenated with the base64 image string in the
     * client and we need the headerless image string to save a valid png, so just
     * split the incoming message by the header to get those pieces.
     */
    const [sequentialKey, imgStr] = msg.split('data:image/png;base64,')

    await fs.writeFile(
      path.join(this.sessionDir, `${sequentialKey}.png`),
      imgStr,
      'base64'
    )

    // console.log(`[⚡️] ${this.clientId}: Wrote file ${filePath}`)
  }

  /**
   * Rename all files to be ffmpeg-friendly (sequential, starting from zero)
   */
  async sortFrameFiles () {
    const filenames = await fs.readdir(this.sessionDir)

    /**
     * Sort by the sequential key passed by the client (stored locally
     * as `{key}.png`)
     */
    const sortedFiles = filenames.sort((a, b) =>
      +a.replace('.png', '') - +b.replace('.png', '')
    )

    // Rename sorted files to reflect the order index
    await Promise.all(
      sortedFiles.map(async (filename, i) =>
        await fs.rename(
          path.join(this.sessionDir, filename),
          path.join(this.sessionDir, `${i}.png`)
        )
      )
    )

    console.log(`[✨] ${this.clientId}: Finished renaming ${sortedFiles.length} files`)
  }

  /**
   * Get image dimensions string ("<width>x<height>") for the first frame in
   * the session directory to use as part of ffmpeg CLI arguments. Note that
   * the output from the `file` command contains extra spaces to be removed.
   */
  async getFrameDimensions () {
      const filenames = await fs.readdir(this.sessionDir)
      const firstFrameFilename = path.join(this.sessionDir, filenames[0])

      const dimsPs = spawn('file', [firstFrameFilename])
      const output = await waitForProcess(dimsPs)

      const match = output && output.match(/(\d+ x \d+)/)
      if (!output || !match) {
        throw 'Could not get image dimensions!'
      }

      return match[1].replace(/\s/g, '')
  }

  async convertFramesToVideo (videoFilePath) {
    console.log(`[⏳] ${this.clientId}: Converting frames to video...`)

    try {
      // Get image dimensions string for ffmpeg arguments
      const dimensions = await this.getFrameDimensions(this.sessionDir)

      // These arguments need to be in order
      const ffmpegArgs = [
        '-r', '60',
        '-f', 'image2',
        '-s', dimensions,
        '-i', path.join(this.sessionDir, '%d.png'),
        '-vcodec', 'libx264',
        '-crf', '18',
        // Uncomment these for lower-quality video
        // '-crf', '25',
        // '-pix_fmt', 'yuv420p',
        '-progress', 'pipe:1',
        videoFilePath
      ]

      // Spawn a process that runs the ffmpeg conversion command
      const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, { shell: true })

      // Pipe output to this stdout so we can see progress
      // ffmpegProcess.stdout.pipe(process.stdout)

      // Wait for the process to finish
      await waitForProcess(ffmpegProcess)

      console.log(`[🎉] ${this.clientId}: Created video from frames`)
    } catch (e) {
      console.error(e)
      throw 'Error converting frames!'
    }
  }

  async deleteFrames () {
    await fs.rmdir(this.sessionDir, { recursive: true })
    console.log(`[💥] ${this.clientId}: Deleted frames`)
  }
}

module.exports = {
  CanvasVideo
}

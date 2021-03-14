# Canvas frames to video

Create a video from individual image frames coming from a client.

Creates a WebSocket server that receives frame data from clients. The
client messages (individual frames) are strings composed of a unique,
sequential numeric ID (like a timestamp, frame index, etc), concatenated with
a base64-encoded image/png string that represents a single frame. Each frame
is saved to disk using the provided sequential ID. When the user has finished
capture, the frames are ordered and renamed to a ffmpeg-friendly, numeric
sequence based on the original sequential frame ID, so the frames can be
converted to video easily. The frames are then converted to a video and deleted.

### Requirements

- [ffmpeg](https://ffmpeg.org/) for generating videos from frames (`brew install ffmpeg`)

- [file](https://linux.die.net/man/1/file) for determining image sizes

### Sending frames

Frames can come from anywhere and are passed via WebSocket as string messages. The
messages are composed of a unique, sequential, numeric ID (like a timestamp,
frame index, etc), concatenated with a base64-encoded image/png string that
represents a single frame.

```js
let frameIndex = 0
function render () {
  // ...render logic...
  const frame = canvas.toDataURL('image/png')
  websocketClient.send((frameIndex++) + frame) // or `Date.now() + frame`, etc
}
```

### Todo

- Control various ffmpeg parameters: video quality, color, video file type, etc

- Currently using inner async functions in WebSocket event handlers because I'm
not sure if the `ws` library can gracefully accept/handle async event
callbacks – figure this out and clean up the code

- Explicit command to generate video instead of only doing it when the socket
connection is closed

- Error handling, tests

### Inspiration

I first encountered this process while working with Zach Watson at
[Stamen](https://stamen.com), where he implemented something similar. If you find
this useful at all, please consider donating to the
[Zachary Watson Memorial Education Fund](https://grayarea.org/initiative/zachary-watson-memorial-education-fellowship/).

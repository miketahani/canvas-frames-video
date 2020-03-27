# Canvas frames to video

Create a video from individual image frames coming from a client.

Creates a WebSocket server that receives frame data from clients. The
client messages (individual frames) are strings composed of a unique,
sequential numeric ID (like a timestamp, frame index, etc), concatenated with
a base64-encoded image/png string that represents a single frame. Each frame
is saved to disk using the sequential ID, and when the user has finished
capture, the frames are ordered and renamed to a ffmpeg-friendly, numeric
sequence based on the original sequential frame ID, so the frames can be
converted to video easily.

### Requirements

- ffmpeg for generating videos from frames (`brew install ffmpeg`)

- [file](https://linux.die.net/man/1/file) for determining image sizes

### Sending frames

Frames can come anywhere and are passed via WebSocket as string messages. The
messages are composed of a unique, sequential, numeric ID (like a timestamp,
frame index, etc), concatenated with a base64-encoded image/png string that
represents a single frame.

```js
let frameIndex = 0
function render () {
  // render logic...
  const frame = canvas.toDataURL('img/png')
  websocketClient.send((frameIndex++) + frame) // or `Date.now() + frame`, etc
}
```

### Inspiration

I first encountered this process while working with Zach Watson at
[Stamen](https://stamen.com), where he implemented something similar. If you find
this useful at all, please consider donating to the
[Zachary Watson Memorial Education Fund](https://grayarea.org/initiative/zachary-watson-memorial-education-fellowship/).

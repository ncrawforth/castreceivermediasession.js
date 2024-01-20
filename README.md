# castreceivermediasession.js
An implementation of the [HTML5 Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) for Google Cast Custom Web Receivers.

Implementing a Custom Web Receiver for Google Cast is much more complex than it ought to be. This library hooks up navigator.mediaSession to the Cast Web Receiver SDK and makes it much simpler.

## Usage
``` javascript
<script src="castreceivermediasession.js"></script>
<video id="player"></video>
<script>

  // Reflect playback state in sender controls
  player.onplaying = function() {
    navigator.mediaSession.playbackState = "playing";
  };
  player.onpause = function() {
    navigator.mediaSession.playbackState = "paused";
  };
  player.ontimeupdate = function() {
    navigator.mediaSession.setPositionState({position: player.currentTime, duration: player.duration});
  };

  // Control playback using sender controls
  navigator.mediaSession.setActionHandler("play", function() {
    player.play();
  });
  navigator.mediaSession.setActionHandler("pause", function() {
    player.pause();
  });
  navigator.mediaSession.setActionHandler("seekto", function(dict) {
    player.currentTime = dict.seekTime;
  });

  // Load media
  try {
    navigator.mediaSession.setActionHandler("load", function(dict) {
      navigator.mediaSession.metadata = new MediaMetadata({title: dict.contentUrl});
      player.src = dict.contentUrl;
      player.play();
    });
  } catch { // Fallback for "load" when debugging in a browser
    navigator.mediaSession.metadata = new MediaMetadata({title: "Big Buck Bunny"});
    player.src = "https://download.blender.org/peach/bigbuckbunny_movies/BigBuckBunny_320x180.mp4";
    player.onclick = function() {player.play();};
  }

</script>
```

## What works
The following actions are supported by ```navigator.mediaSession.setActionHandler```:
* **load** is non-standard. The action hander is called with a dict containing *contentUrl* when the sender app sends a URL to load.
* **play**
* **pause**
* **nexttrack**
* **previoustrack**
* **seekto**

## What doesn't work
* The contents of ```MediaMetadata.artwork``` are currently ignored.
* Exceptions specified by the Media Session spec are not raised.

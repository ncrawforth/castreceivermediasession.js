# castreceivermediasession.js
An implementation of the [HTML5 Media Session API](https://developer.mozilla.org/en-US/docs/Web/API/Media_Session_API) for Google Cast receivers.

Implementing a Custom Web Receiver for Google Cast is much more complex than it ought to be. This library hooks up navigator.mediaSession to the Cast Web Receiver SDK and makes it much simpler.

## Usage
``` javascript
<script src="castreceivermediasession.js"></script>
<script>
  navigator.mediaSession.setActionHandler("load", function(dict) {
    navigator.mediaSession.metadata = new MediaMetadata({title: dict.contentUrl});
    navigator.mediaSession.playbackState = "playing";
  }
</script>
```

## What works
The following actions are supported by ```navigator.mediaSession.setActionHandler```:
* **load** receives a dict containing *contentUrl* when the sender app sends a URL to load.
* **play**
* **pause**
* **nexttrack**
* **previoustrack**
* **seekto** receives a dict containing *seekTime*.
  
```navigator.mediaSession.metadata```, ```navigator.mediaSession.playbackState``` and ```navigator.mediaSession.setPositionState``` work more-or-less according to the Media Session spec.

## What doesn't work
* The contents of ```MediaMetadata.artwork``` is currently ignored.
* Exceptions specified by the Media Session spec are not raised.

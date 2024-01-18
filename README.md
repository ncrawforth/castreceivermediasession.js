# castreceivermediasession.js
An implementation of the HTML5 Media Session API for Google Cast receivers.

## Usage

``` javascript
<script src="castreceivermediasession.js"></script>
<script>
  navigator.mediaSession.setActionHandler("load", function(url) {
    navigator.mediaSession.metadata = new MediaMetadata({title: url});
  }
</script>
```

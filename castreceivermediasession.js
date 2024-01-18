(function() {
  const actionHandlers = {};
  const eventListeners = {};
  function mediaEvent(type) {
    if (type in eventListeners) {
      for (let l of eventListeners[type]) l();
    }
  }
  let updateSupportedMediaCommands = function() {};
  const mediaElement = {
    addEventListener: function(type, listener) {
      if (!(type in eventListeners)) eventListeners[type] = [];
      eventListeners[type].push(listener);
    },
    removeEventListener: function(type, listener) {
      if (type in eventListeners) {
        for (let i = eventListeners[type].length - 1; i >= 0; i--) {
          if (eventListeners[type][i] == listener) eventListeners[type].slice(i);
        }
      }
    },
    setAttribute: function(k, v) {mediaElement[k] = v;},
    removeAttribute: function(k) {delete mediaElement[k];},
    load: function() {},
    pause: function() {},
    play: function() {},
    duration: Infinity,
    currentTime: 0,
    src: "",
    volume: 1,
    muted: false,
    paused: true,
    toString: function() {return "mediaElement";}
  };
  navigator.mediaSession.setActionHandler = function(type, handler) {
    if (type == "load" && !("load" in actionHandlers) && mediaElement.src != "") {
      handler(mediaElement.src);
    }
    actionHandlers[type] = handler;
    updateSupportedMediaCommands();
  };
  navigator.mediaSession.setPositionState = function(state) {
    if (state.duration) {
      mediaElement.duration = state.duration;
      mediaEvent("durationchange");
    }
    if (state.position) {
      mediaElement.currentTime = state.position;
      mediaEvent("timeupdate");
    }
    if (state.playbackRate) {
      mediaElement.playbackRate = state.playbackRate;
      mediaEvent("ratechange");
    }
  };
  (async function() {
    await new Promise(function(resolve, reject) {
      let s = document.createElement("script");
      s.onload = resolve;
      s.src = "https://www.gstatic.com/cast/sdk/libs/caf_receiver/v3/cast_receiver_framework.js";
      document.head.appendChild(s);
    });
    const context = cast.framework.CastReceiverContext.getInstance();
    const playerManager = context.getPlayerManager();
    const mediaMetadata = new cast.framework.messages.MusicTrackMediaMetadata();
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.LOAD, async function(requestData) {
      requestData.media.metadata = mediaMetadata;
      if ("load" in actionHandlers) actionHandlers.load(requestData.media.contentUrl || requestData.media.contentId || requestData.media.entity);
      setTimeout(function() {mediaEvent("loadedmetadata");}, 100);
      return requestData;
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PLAY, async function(requestData) {
      if (requestData.sessionId) {
        if ("play" in actionHandlers) actionHandlers.play();
      } else {
        return requestData;
      }
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PAUSE, async function(requestData) {
      if (requestData.sessionId) {
        if ("pause" in actionHandlers) actionHandlers.pause();
      } else {
        return requestData;
      }
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.QUEUE_UPDATE, async function(requestData) {
      if (requestData.jump == -1 && "previoustrack" in actionHandlers) actionHandlers.previoustrack();
      if (requestData.jump == 1 && "nexttrack" in actionHandlers) actionHandlers.nexttrack();
    });
    const options = new cast.framework.CastReceiverOptions();
    options.supportedCommands = cast.framework.messages.Command.STREAM_TRANSFER;
    options.disableIdleTimeout = true;
    options.skipPlayersLoad = true;
    options.mediaElement = mediaElement;
    context.start(options);
    updateSupportedMediaCommands = function() {
      const actionMapping = {pause: 1, nexttrack: 64, previoustrack: 128};
      for (type in actionMapping) {
        if (actionHandlers[type]) {
          playerManager.addSupportedMediaCommands(actionMapping[type], true);
        } else {
          playerManager.removeSupportedMediaCommands(actionMapping[type], true);
        }
      }
    };
    updateSupportedMediaCommands();
    let timeout = null;
    setInterval(function() {
      let md = navigator.mediaSession.metadata || {title: "", artist: "", album: ""};
      if (mediaMetadata.title != md.title || mediaMetadata.artist != md.artist || mediaMetadata.albumName != md.album) {
        mediaMetadata.title = md.title;
        mediaMetadata.artist = md.artist;
        mediaMetadata.albumName = md.album;
        playerManager.broadcastStatus(true);
      }
      if (navigator.mediaSession.playbackState == "playing") {
        playerManager.play();
        clearTimeout(timeout);
        timeout = setTimeout(function() {context.stop();}, 900000);
      } else {
        playerManager.pause();
      }
    }, 1000);
  })();
})();

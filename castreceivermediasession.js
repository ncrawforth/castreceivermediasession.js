if (navigator.userAgent.match(/CrKey/)) (function() {
  const actionHandlers = {};
  const eventListeners = {};
  function mediaEvent(type) {
    if (type in eventListeners) {
      for (let l of eventListeners[type]) l();
    }
  }
  let updateSupportedMediaCommands = function() {};
  let mediaSrc = "";
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
    set src(v) {mediaSrc = v;},
    get src() {return mediaSrc;},
    volume: 1,
    muted: false,
    paused: true,
    toString: function() {return "mediaElement";}
  };
  navigator.mediaSession.setActionHandler = function(type, handler) {
    if (type == "load" && !("load" in actionHandlers) && mediaSrc != "") {
      handler(mediaSrc);
    }
    actionHandlers[type] = handler;
    updateSupportedMediaCommands();
  };

  let advanceTimeout = null;
  function advanceTime() {
    clearTimeout(advanceTimeout);
    advanceTimeout = setTimeout(function() {
      if (navigator.mediaSession.playbackState == "playing") {
        mediaElement.currentTime += mediaElement.playbackRate * 0.4;
        mediaEvent("timeupdate");
        advanceTime();
      }
    }, 400);
  }
      
  navigator.mediaSession.setPositionState = function(state) {
    if (state.duration && mediaElement.duration != state.duration) {
      mediaElement.duration = state.duration;
      mediaEvent("durationchange");
    }
    if (state.position && mediaElement.currentTime != state.position) {
      mediaElement.currentTime = state.position;
      mediaEvent("timeupdate");
      advanceTime();
    }
    if (state.playbackRate && mediaElement.playbackRate != state.playbackRate) {
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
      let contentUrl = requestData.media.contentUrl || requestData.media.contentId || requestData.media.entity;
      requestData.media.contentUrl = requestData.media.contentId = requestData.media.entity = contentUrl;
      requestData.media.streamType = "BUFFERED";
      if ("load" in actionHandlers) await actionHandlers.load({action: "load", contentUrl: contentUrl});
      setTimeout(function() {mediaEvent("loadedmetadata");}, 100);
      return requestData;
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PLAY, async function(requestData) {
      if (requestData.requestId != 0) {
        if ("play" in actionHandlers) actionHandlers.play({action: "play"});
      } else {
        return requestData;
      }
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.PAUSE, async function(requestData) {
      if (requestData.requestId != 0) {
        if ("pause" in actionHandlers) actionHandlers.pause({action: "pause"});
      } else {
        return requestData;
      }
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.QUEUE_UPDATE, async function(requestData) {
      if (requestData.jump == -1 && "previoustrack" in actionHandlers) actionHandlers.previoustrack({action: "previoustrack"});
      if (requestData.jump == 1 && "nexttrack" in actionHandlers) actionHandlers.nexttrack({action: "nexttrack"});
    });
    playerManager.setMessageInterceptor(cast.framework.messages.MessageType.SEEK, async function(requestData) {
      if ("seekto" in actionHandlers) actionHandlers.seekto({action: "seekto", seekTime: requestData.currentTime});
    });
    const options = new cast.framework.CastReceiverOptions();
    options.supportedCommands = cast.framework.messages.Command.STREAM_TRANSFER | cast.framework.messages.Command.SET_VOLUME;
    options.disableIdleTimeout = true;
    options.skipPlayersLoad = true;
    options.mediaElement = mediaElement;
    context.start(options);
    updateSupportedMediaCommands = function() {
      const actionMapping = {pause: cast.framework.messages.Command.PAUSE, nexttrack: cast.framework.messages.Command.QUEUE_NEXT, previoustrack: cast.framework.messages.Command.QUEUE_PREV, seekto: cast.framework.messages.Command.SEEK};
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
    let oldPlaybackState = "none";
    setInterval(function() {
      let md = navigator.mediaSession.metadata || {title: "", artist: "", album: ""};
      if (mediaMetadata.title != md.title || mediaMetadata.artist != md.artist || mediaMetadata.albumName != md.album) {
        mediaMetadata.title = md.title;
        mediaMetadata.artist = md.artist;
        mediaMetadata.albumName = md.album;
        playerManager.broadcastStatus(true);
      }
      if (navigator.mediaSession.playbackState != oldPlaybackState) {
        if (navigator.mediaSession.playbackState == "playing") {
          playerManager.play();
        } else {
          playerManager.pause();
        }
        oldPlaybackState = navigator.mediaSession.playbackState;
      }
      if (navigator.mediaSession.playbackState == "playing") {
        advanceTime();
        clearTimeout(timeout);
        timeout = setTimeout(function() {context.stop();}, 900000);
      }
    }, 1000);
  })();
})();

// ==UserScript==
// @name         Metalligaen.tv player optimizations
// @namespace    MetalligaenLive
// @version      2025-02-15
// @description  Fixer lortensen
// @author       You
// @match        https://www.metalligaen.tv/*
// @icon         https://files.livearenasports.com/files/20148a38-7b29-4e41-bbc5-1281abde2aae
// @require      https://lars.hillsbrook.dk/tampermonkey-helpers.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  console.log('Loading script: Metalligaen.tv player optimizations');
  console.log('window.customElements.get("app-root-play-site")', window.customElements.get('app-root-play-site'));

  // Don't pause on tab change (we need to add this immediately/before videojs own eventlistener - for it to work)
  document.addEventListener('visibilitychange', function (e) {
    e.stopImmediatePropagation();
  });

  // window.addEventListener('ionRouteDidChange', function () {
  //   console.log('ionRouteDidChange');
  //   runCode();
  // });

  window.addEventListener('playerReady', async function (e) {
    console.log('playerReady', e.target.localName, e);

    if (e.target.localName == 'app-game-video') {
      runCode();
    }
  });

  function runCode() {
    // Prevent overflow in fullscreen - because mobile browsers auto decides to fit or stretch
    const css = [
      `.vjs-fullscreen #app-video_html5_api {
        height: 100vh !important;
      }`,
    ];
    loadCustomStyling(css);

    const scripts = ['https://vjs.zencdn.net/8.16.1/video.min.js'];
    loadScripts(scripts, 0, optimizePlayer);
  }

  function optimizePlayer() {
    if (!window.location.href.startsWith('https://www.metalligaen.tv/da/game/')) {
      console.log('This is not a game page - returning.');
      return;
    } else {
      console.log('This is a game page!');
    }

    // Player sync
    initPlayerSyncToolbar();

    const videoPlayer = videojs('app-video');
    const nativeVideoPlayer = document.getElementById('app-video_html5_api');

    // Debugging
    window.myVideoJsPlayer = videoPlayer;
    console.log('videoPlayer:', videoPlayer);
    // console.log('navigator.userActivation.hasBeenActive:', navigator.userActivation.hasBeenActive);

    // Check own global player settings
    if (navigator.userActivation.hasBeenActive) {
      // If we don't check hasBeenActive, the browser might pause the player instead
      console.log('Setting muted based on localStorage setting');
      videoPlayer.muted((localStorage.getItem('mtv-muted') ?? '') === 'true');
    }

    console.log('Setting volume based on localStorage setting');
    videoPlayer.volume(Number.parseFloat(localStorage.getItem('mtv-volume') ?? 1.0));

    // Hide big mute icon
    console.log('Hiding big mute icon');
    document.getElementById('mute-overlay').style.display = 'none';

    // Change default volume to 100%
    if (videoPlayer.volume() == 0.5) {
      console.log('Changing default volume from 50% to 100%');
      videoPlayer.volume(1);
    }

    if (videoPlayer.paused()) {
      console.log('Videoplayer is paused on load. Trigger play-event');
      videoPlayer.play();
    }

    // Save and reuse settings across players
    nativeVideoPlayer.addEventListener('volumechange', function (e) {
      console.log('volumechange event - saving to localStorage (muted, volume)', e.target.muted, e.target.volume);
      localStorage.setItem('mtv-muted', e.target.muted);
      localStorage.setItem('mtv-volume', e.target.volume);
    });

    // Keybindings
    document.addEventListener('keydown', function (e) {
      switch (e.key.toLowerCase()) {
        case 'f':
          if (!document.fullscreenElement) {
            nativeVideoPlayer.requestFullscreen();
          } else {
            document.exitFullscreen();
          }
          break;
        case 'm':
          videoPlayer.muted(!videoPlayer.muted());
          break;
        case 'arrowup':
          videoPlayer.volume(videoPlayer.volume() + 0.1);
          break;
        case 'arrowdown':
          videoPlayer.volume(videoPlayer.volume() - 0.1);
          break;
        default:
          break;
      }
    });

    // // Double click
    // videojs('my-player', {
    //   userActions: {
    //     doubleClick: function () {
    //       videoPlayer.currentTime(videoPlayer.currentTime() + 10);
    //     }
    //   }
    // });
  }
})();

async function initPlayerSyncToolbar() {
  let targetElement = document.getElementsByTagName('body')[0];

  // Create toolbar
  const wrapper = document.createElement('div');
  wrapper.id = 'custom-extension-toolbar';
  wrapper.insertAdjacentHTML(
    'beforeend',
    `
    <button id="toolbar-get-server-time" class="">Get server time</button>
    <button id="toolbar-set-server-time" class="">Set server time</button>
    <div class="checkbox-container">
      <label>
        <span>I am the client</span>
        <input id="toolbar-isclient" type="checkbox" name="isclient">
      </label>
    </div>
    <div class="checkbox-container">
      <label>
        <span>I am the server</span>
        <input id="toolbar-isserver" type="checkbox" name="isserver">
      </label>
    </div>
    `
  );

  targetElement.appendChild(wrapper);

  // Add css element
  const customCss = `
    #custom-extension-toolbar {
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 999;
      text-align: right;
    }

    #custom-extension-toolbar button,
    #custom-extension-toolbar .checkbox-container {
      /*width: 100px;*/
      width: auto;
      margin: 0;
      padding: 10px;

      background-color: white;
      color: black;
      border: 1px solid black;
      border-radius: 10px;
      cursor: pointer;

      font-size: 12px;
      font-weight: 500;
      font-family: sans-serif;
      text-transform: uppercase;
    }

    #custom-extension-toolbar .checkbox-container {
      display: inline-block;
    }

    #custom-extension-toolbar .checkbox-container label {
      cursor: pointer;
    }

    #custom-extension-toolbar input[type="checkbox"] {
      vertical-align: middle;
    }

    #custom-extension-toolbar button.custom-error {
      background-color: #dc3545;
      color: white;
    }

    #custom-extension-toolbar button.custom-success {
      background-color: #7bbb27;
      color: white;
    }
  `;

  const styleElement = document.createElement('style');
  styleElement.textContent = customCss;

  document.head.appendChild(styleElement);

  // Add javascript
  document.getElementById('toolbar-get-server-time').addEventListener('click', getServerTime);
  document.getElementById('toolbar-set-server-time').addEventListener('click', setServerTime);

  let isClientIntervalId;
  const isClientCheckbox = document.getElementById('toolbar-isclient');
  isClientCheckbox.addEventListener('change', (event) => {
    if (event.target.checked) {
      // Run now
      getServerTime();

      // Start the interval if the checkbox is checked
      isClientIntervalId = setInterval(getServerTime, 5000);
    } else {
      // Clear the interval if the checkbox is unchecked
      clearInterval(isClientIntervalId);
    }
  });

  let isServerIntervalId;
  const isServerCheckbox = document.getElementById('toolbar-isserver');
  isServerCheckbox.addEventListener('change', (event) => {
    const videoPlayer = document.getElementById('app-video_html5_api');
    console.log('videoPlayer:', videoPlayer);

    if (event.target.checked) {
      // Run now
      setServerTime();

      // Start the interval if the checkbox is checked
      isServerIntervalId = setInterval(setServerTime, 5000);

      // Add listeners to the video player
      if (videoPlayer) {
        videoPlayer.addEventListener('play', setServerTime);
        videoPlayer.addEventListener('pause', setServerTime);
        videoPlayer.addEventListener('seeked', setServerTime);
      }
    } else {
      // Clear the interval if the checkbox is unchecked
      clearInterval(isServerIntervalId);

      if (videoPlayer) {
        // Remove listeners to the video player
        videoPlayer.removeEventListener('play', setServerTime);
        videoPlayer.removeEventListener('pause', setServerTime);
        videoPlayer.removeEventListener('seeked', setServerTime);
      }
    }
  });
}

async function getServerTime() {
  fetch('https://makestreamiordensen.webshape.dk/client.php')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json(); // Parse the JSON from the response
    })
    .then((data) => {
      // console.log('Call to server: Success', data);

      const videoPlayer = document.getElementById('app-video_html5_api');
      if (!videoPlayer) return;

      let streamTime = Number.parseFloat(data.StreamTime);
      const serverTime = new Date(data.ServerTime);
      const isPaused = data.IsPaused == 1 ? true : false;
      const currentTime = new Date();

      if (isPaused) videoPlayer.pause();
      else if (videoPlayer.paused) videoPlayer.play();

      if (!isPaused) {
        // Find out the diff here
        const serverClientTimeDiff = currentTime.getTime() - serverTime.getTime(); // In milliseconds
        const diffInSeconds = Math.abs(serverClientTimeDiff / 1000);
        streamTime += diffInSeconds;
      }

      // Check if it is neccessary to set the player time - because it stutters (diff bigger than 1 sec)
      if (Math.abs(streamTime - videoPlayer.currentTime) > 1) {
        videoPlayer.currentTime = streamTime;
      }
    })
    .catch((error) => {
      console.log('Call to server: Failed', error);
    });
}

async function setServerTime() {
  const videoPlayer = document.getElementById('app-video_html5_api');
  if (!videoPlayer) return;

  const streamTime = videoPlayer.currentTime;
  const serverTime = new Date().toISOString();
  const isPaused = videoPlayer.paused ? 1 : 0;

  fetch(`https://makestreamiordensen.webshape.dk/server.php?serverTime=${serverTime}&streamTime=${streamTime}&isPaused=${isPaused}`)
    .then((response) => {
      if (!response.ok) throw new Error('Network response was not ok');

      // console.log('Call to server: Success', response);
    })
    .catch((error) => {
      console.log('Call to server: Failed', error);
    });
}

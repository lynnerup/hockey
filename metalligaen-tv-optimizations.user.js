// ==UserScript==
// @name         Metalligaen.tv player optimizations
// @namespace    MetalligaenLive
// @version      2025-02-02
// @description  Fixer lortensen
// @author       You
// @match        https://www.metalligaen.tv/da/game/*
// @icon         https://files.livearenasports.com/files/20148a38-7b29-4e41-bbc5-1281abde2aae
// @require      https://lars.hillsbrook.dk/tampermonkey-helpers.js
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Don't pause on tab change (we need to add this immediately/before videojs own eventlistener - for it to work)
  document.addEventListener('visibilitychange', function (e) {
    e.stopImmediatePropagation();
  });

  console.log('Loading script: Metalligaen.tv player optimizations');
  console.log('window.customElements.get("app-root-play-site")', window.customElements.get('app-root-play-site'));

  /* Prevent overflow in fullscreen - because mobile browsers auto decides to fit or stretch */
  const css = [
    `.vjs-fullscreen #app-video_html5_api {
      height: 100vh !important;
    }`,
  ];
  loadCustomStyling(css);

  const scripts = ['https://vjs.zencdn.net/8.16.1/video.min.js'];
  loadScripts(scripts, 0, runCode);

  function runCode() {
    // TODO: Maybe we can do this smarter and check when the video element is loaded instead of a timeout
    // Maybe just make a function that spam-checks this: window.customElements.get('app-root-play-site')

    setTimeout(() => {
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

      if (!videoPlayer.muted() == false) {
        // Hide big mute icon
        console.log('Hiding big mute icon');
        document.getElementById('mute-overlay').style.display = 'none';
      }

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

      // // Double click
      // videojs('my-player', {
      //   userActions: {
      //     doubleClick: function () {
      //       videoPlayer.currentTime(videoPlayer.currentTime() + 10);
      //     }
      //   }
      // });

      // Tampermonkey auto-update test..
    }, 5000); // 2000
  }
})();

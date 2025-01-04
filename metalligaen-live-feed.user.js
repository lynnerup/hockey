function addRemainingTime() {
  $('#nav-tabContent tbody tr td:first-of-type').each((index, obj) => {
    var text = $(obj).text();
    var contentHasLoaded = text.indexOf('{{') < 0;
    var hasBeenAdded = text.indexOf('(') > 0;

    if (!hasBeenAdded && contentHasLoaded) {
      var minutesString = text.substring(0, 2);
      var secondsString = text.substring(3);
      var totalSeconds = (parseInt(minutesString) * 60 + parseInt(secondsString)) % (20 * 60);
      var remainingTotalSeconds = 20 * 60 - totalSeconds;
      var remainingMinutes = Math.floor(remainingTotalSeconds / 60);
      var remainingSeconds = remainingTotalSeconds - remainingMinutes * 60;
      var timeString = ' (' + remainingMinutes.toString().padStart(2, '0') + ':' + remainingSeconds.toString().padStart(2, '0') + ')';

      $(obj).text(text + timeString);
    }
  });

  $('#nav-tabContent tr td:first-of-type').css('white-space', 'nowrap');
}

function makeCommentMoreReadable() {
  $('#nav-tabContent tbody tr td:nth-of-type(2)').each((index, obj) => {
      var text = $(obj).text().trim();
      var contentHasLoaded = text.indexOf('{{') < 0;

      if(contentHasLoaded) {
        var m = "";

        m = text.match("^I tiden .+? scorer ([a-zA-Z]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?) og af (.+?)\\. \\[(.+?)\\]$");

        if(m) {
            $(obj).text(`${m[1]} [${m[6]}] | ${m[2]} | ${m[3]}, ${m[4]}, ${m[5]}`);
            return;
        }

        m = text.match("^I tiden .+? scorer ([a-zA-Z]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?)\\. \\[(.+?)\\]$");

        if(m) {
            $(obj).text(`${m[1]} [${m[5]}] | ${m[2]} | ${m[3]}, ${m[4]}`);
            return;
        }

        m = text.match("^I tiden .+? scorer ([a-zA-Z]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?)\\. \\[(.+?)\\]$");

        if(m) {
            $(obj).text(`${m[1]} [${m[4]}] | ${m[2]} | ${m[3]}`);
            return;
        }

        m = text.match("^(.+?): \\(.+?\\) (.+?) (.+) \\[(.+?)\\]\\. (.+?) \\(uassisteret\\)$");

        if(m) {
            $(obj).text(`${m[2]} [${m[4]}] | ${m[1]} | ${m[5]}`);
            return;
        }

        m = text.match("^(.+?): \\(.+?\\) (.+?) (.+) \\[(.+?)\\]\\. (.+?) \\((.*?), (.*?)\\)$");

        if(m) {
            $(obj).text(`${m[2]} [${m[4]}] | ${m[1]} | ${m[5]}, ${m[6]}, ${m[7]}`);
            return;
        }

        m = text.match("^(.+?): \\(.+?\\) (.+?) (.+) \\[(.+?)\\]\\. (.+?) \\((.*?)\\)$");

        if(m) {
            $(obj).text(`${m[2]} [${m[4]}] | ${m[1]} | ${m[5]}, ${m[6]}`);
            return;
        }

        m = text.match("^I tiden .+? udvises (.+?) fra (.+?) (.+) ([0-9]+) minutter for (.+?)\\.$");

        if(m) {
            $(obj).text(`${m[2]} | ${m[4]} mins | ${m[5]} | ${m[1]}`);
            return;
        }
      }
  });
}

function fixTable() {
  addRemainingTime();
  makeCommentMoreReadable();
}

(function () {
  'use strict';

  fixTable();

  window.setInterval(fixTable, 3000);
})();

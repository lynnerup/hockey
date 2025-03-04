// ==UserScript==
// @name         Metalligaen.dk live feed optimizations
// @namespace    MetalligaenLive
// @version      2025-03-04
// @description  try to take over the world!
// @author       You
// @match        https://metalligaen.dk/live/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=metalligaen.dk
// @require      https://lars.hillsbrook.dk/tampermonkey-helpers.js
// @grant        none
// ==/UserScript==

/* TODO: Move these methods into the classes below, so they work without delay. */
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

        m = text.match("^Udvisningen til .* er slut.$");
        
        if(m) {
            $(obj).closest('tr').remove();
            return;
        }

        m = text.match("^I tiden .+? scorer ([a-zA-ZæøåÆØÅ]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?) og af (.+?)\\. \\[(.+?)\\]$");

        if(m) {
            $(obj).text(`${m[1]} [${m[6]}] | ${m[2]} | ${m[3]}, ${m[4]}, ${m[5]}`);
            return;
        }

        m = text.match("^I tiden .+? scorer ([a-zA-ZæøåÆØÅ]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?)\\. \\[(.+?)\\]$");

        if(m) {
            $(obj).text(`${m[1]} [${m[5]}] | ${m[2]} | ${m[3]}, ${m[4]}`);
            return;
        }

        m = text.match("^I tiden .+? scorer ([a-zA-ZæøåÆØÅ]+) .+? til stillingen (.+?)\\. Målet blev scoret af spiller (.+?)\\. \\[(.+?)\\]$");

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
            $(obj).text(`${m[5]} | ${m[4]} mins | ${m[2]} | ${m[1]}`);
            return;
        }
      }
  });
}

function fixTable() {
  addRemainingTime();
  makeCommentMoreReadable();
}

function addPlayerSearch() {
  const css = `
    .line-up__player:hover {
      cursor: pointer;
    }
  `;

  Page.importCss(css);

  document.querySelector('#tab_nav-line-ups')?.addEventListener('click', (e) => {
    const players = document.querySelectorAll('.line-up__player');

    players.forEach((x) => {
      x.addEventListener('click', (e) => {
        const name = x.querySelector('.line-up__player-name').innerText.replaceAll('.', '').replaceAll(' ', '+');

        // window.open(`https://www.eliteprospects.com/search/player?q=${name}`, '_blank').focus();
        window.open(`https://www.google.com/search?q="eliteprospects"+${name}`, '_blank').focus();
      });
    });
  });
}


/* LINQ */

Array.prototype.select = function(selector) {
  return this.map(selector);
};

Array.prototype.sum = function(selector) {
  return this.reduce((totalValue, obj) => totalValue + selector(obj), 0);
};

Array.prototype.first = function(selector) {
  for(var item of this) {
    if(selector(item)) {
      return item;
    }
  }
};

Array.prototype.groupByToList = function(keySelector) {
  var items = this
    .reduce(function(rv, x) {
      (rv[keySelector(x)] ??= []).push(x);
      return rv;
    }, {});
  
  return Object
    .entries(items)
    .select(a => Object.fromEntries([
      ['key', a[0]],
      ['value', a[1]]
    ]));
};

// Orders by the first selector descending, and by the second selector ascending.
Array.prototype.orderByDescending = function(valueSelector, valueSelector2) {
  var compare = (o1, o2) => {
    var v1 = valueSelector(o1);
    var v2 = valueSelector(o2);

    if (v1 < v2) {
      return 1;
    }

    if (v1 > v2) {
      return -1;
    }

    // They have equal 1. value
    if(!valueSelector2) {
      return 0;
    }

    v1 = valueSelector2(o1);
    v2 = valueSelector2(o2);

    if (v1 < v2) {
      return -1;
    }

    if (v1 > v2) {
      return 1;
    }

    return 0;
  }
  
  this.sort(compare);

  return this;
}

Array.prototype.distinct = function(valueSelector) {
  return this.reduce((unique, o1) => {
    if(!unique.some(o2 => valueSelector(o2) === valueSelector(o1))) {
      unique.push(o1);
    }
    return unique;
  }, []);
}


/* App */

class Page {
  static splitCssStatements(css) {
    return css.split('}').map(s => s + '}').slice(0, -1);
  }

  static importCss(cssBlock) {
    const style = document.getElementById("GM_addStyleBy8626") || (function() {
      const style = document.createElement('style');
      style.type = 'text/css';
      style.id = "GM_addStyleBy8626";
      document.head.appendChild(style);
      return style;
    })();

    const sheet = style.sheet;

    Page.splitCssStatements(cssBlock).forEach(css => {
        sheet.insertRule(css, (sheet.rules || sheet.cssRules || []).length);
    });
  }
}

class GameJson {
  static getTeamTown(gameJson, isHomeTeam) {
    var teamName = isHomeTeam
      ? gameJson.homeTeamName
      : gameJson.awayTeamName;

    return teamName.split(' ')[0];
  }

  static getPlayerInfo(gameJson, isHomeTeam, playerNumber) {
    var player = gameJson.roster
      .first(p => p.homeTeam == isHomeTeam && p.jerseyNumber == playerNumber);
    
    return Object.fromEntries([
      ['isHomeTeam', player.homeTeam],
      ['number', player.jerseyNumber],
      ['name', player.playerName],
      ['imageUrl', player.playerImage]
    ]);
  }

  static getPenaltiesPrPerson(gameJson) {
    return gameJson.penalties
      .groupByToList(x => x.homeTeam + '-' + x.jersey)
      .select(pair => Object.fromEntries([
        ['number', pair.value[0].jersey],
        ['name', pair.value[0].name],
        ['teamTown', GameJson.getTeamTown(gameJson, pair.value[0].homeTeam)],
        ['penaltyMinutes', pair.value.sum(p => p.penaltyMinutes)]
      ]));
  }

  static getPointsPrPerson(gameJson) {
    var players = {};

    gameJson.goals.forEach((goal) => {
      var key = goal.homeTeam + '-' + goal.scorer;
      
      if(!players.hasOwnProperty(key)) {
          players[key] = Object.fromEntries([
              ['number', goal.scorer],
              ['name', goal.scorerName],
              ['teamTown', GameJson.getTeamTown(gameJson, goal.homeTeam)],
              ['goals', 0],
              ['assists', 0],
              ['points', 0]
          ]);
      }
  
      players[key].goals++;
      players[key].points++;
  
      if(goal.assist1 > 0) {
          key = goal.homeTeam + '-' + goal.assist1;
  
          if(!players.hasOwnProperty(key)) {
              players[key] = Object.fromEntries([
                  ['number', goal.assist1],
                  ['name', goal.assist1Name],
                  ['teamTown', GameJson.getTeamTown(gameJson, goal.homeTeam)],
                  ['goals', 0],
                  ['assists', 0],
                  ['points', 0]
              ]);
          }
      
          players[key].assists++;
          players[key].points++;
      }
  
      if(goal.assist2 > 0) {
          key = goal.homeTeam + '-' + goal.assist2;
  
          if(!players.hasOwnProperty(key)) {
              players[key] = Object.fromEntries([
                  ['number', goal.assist2],
                  ['name', goal.assist2Name],
                  ['teamTown', GameJson.getTeamTown(gameJson, goal.homeTeam)],
                  ['goals', 0],
                  ['assists', 0],
                  ['points', 0]
              ]);
          }
      
          players[key].assists++;
          players[key].points++;
      }
    });

    return Object
      .entries(players)
      .select(a => a[1]);
  }
}

class Ui {
  static updatePenaltySummary(gameJson) {
    $('#penalty-summary').empty();

    var html = '';

    GameJson.getPenaltiesPrPerson(gameJson)
      .orderByDescending(x => x.penaltyMinutes, x => x.name)
      .forEach(player => {
        var subHtml = `
          <tr onclick="window.open('https://www.google.com/search?q=%22eliteprospects%22+` + player.teamTown + `+` + player.name + `',  '_blank')">
            <td class="center">` + player.number + `</td>
            <td>` + player.name + `</td>
            <td>` + player.teamTown + `</td>
            <td class="center">` + player.penaltyMinutes + `</td>
          </tr>
        `;

        html += subHtml;
      });

      html = `
        <table>
          <thead>
            <th class="center">#</th>
            <th>Navn</th>
            <th>Hold</th>
            <th class="center">Mins</th>
          </thead>
          <tbody>
            ` + html + `
          </tbody>
        </table>
      `;

      $('#penalty-summary').append(html);
  }

  static updatePointSummary(gameJson) {
    $('#point-summary').empty();

    var html = '';

    GameJson.getPointsPrPerson(gameJson)
      .orderByDescending(x => x.points, x => x.name)
      .forEach(player => {
        var subHtml = `
          <tr onclick="window.open('https://www.google.com/search?q=%22eliteprospects%22+` + player.teamTown + `+` + player.name + `',  '_blank')">
            <td class="center">` + player.number + `</td>
            <td>` + player.name + `</td>
            <td>` + player.teamTown + `</td>
            <td class="center">` + player.points + `</td>
            <td class="center">` + player.goals + `</td>
            <td class="center">` + player.assists + `</td>
          </tr>
        `;
        
        html += subHtml;
      });

      html = `
        <table>
          <thead>
            <th class="center">#</th>
            <th>Navn</th>
            <th>Hold</th>
            <th class="center">P</th>
            <th class="center">G</th>
            <th class="center">A</th>
          </thead>
          <tbody>
            ` + html + `
          </tbody>
        </table>
      `;

      $('#point-summary').append(html);
  }

  static update(gameJson) {
    Ui.updatePenaltySummary(gameJson);
    Ui.updatePointSummary(gameJson);
  }

  static init() {
    Page.importCss(`
      .tabs .tab__content {
        padding: 0 !important;
      }
      
      .headline {
        max-width: 600px;
        margin: 30px auto 0;
        padding: 7px 0;
        background: #cce1e6;
        text-align: center;
        font-weight: bold;
        color: #006b91;
      }
      
      .player-table {
        max-width: 600px;
        margin: 0 auto;
        padding: 10px;
        background: white;
        font-size: 0.9em;
      }

        .player-table th, .player-table td {
          padding: 0 3px;
          cursor: pointer;
        }

        .player-table table {
          width: 100%;
        }

        .player-table .center {
          text-align: center;
        }
    `);

    var html = `
      <div class="headline">POINT</div>
      <div id="point-summary" class="player-table"></div>
      <div class="headline">UDVISNINGER</div>
      <div id="penalty-summary" class="player-table"></div>
    `;

    $('#gameDataCollapse').append(html);
  }
}

class App {
  static latestReceivedJsonGames = '';
  static selectedGameId = 0;

  static updateUi() {
    if(App.latestReceivedJsonGames != '' && App.selectedGameId > 0) {
      var gameJson = this.latestReceivedJsonGames
        .first(g => g.gameID == App.selectedGameId);
      
      Ui.update(gameJson);
    }
  }

  static cacheDataAndFixBugs(jsonGames) {
    // The data received from the backend contains bugs.
    // Specifically, it contains duplicated in the goals list.

    jsonGames.forEach(g => {
      g.goals = g.goals.distinct(goal => goal.goalTime);
    });

    App.latestReceivedJsonGames = jsonGames;
  }

  static awaitAndHandleHttpResponse(xhr) {
    if(xhr.status == 0) {
        console.log('Response not received yet. Trying again.');
        setTimeout(() => App.awaitAndHandleHttpResponse(xhr), 500);
    } else {
        var jsonGames = JSON.parse(xhr.responseText);
        console.log('Got response', jsonGames);
        App.cacheDataAndFixBugs(jsonGames);
        App.updateUi();
    }
  }

  static setupHttpInterceptor() {
    // Override the open method of XMLHttpRequest to intercept all requests
    var originalOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function(method, url) {
      if(url == 'https://metalligaen.dk/umbraco/api/LiveScoreApi/Get/') {
          console.log('Intercepted HTTP request: ' + url);
          App.awaitAndHandleHttpResponse(this);
      }
      
      originalOpen.apply(this, arguments);
    };
  }

  static setupEventListeners() {
    
    // Wait until the games has loaded on the page.
    if($('.live-score__button').length == 0) {
      setTimeout(App.setupEventListeners, 1000);
    }

    // When a game is selected, update our ui.
    $('.live-score__button').bind('click', e => {
      var gameIdString = $(e.target).attr('aria-controls').replace('gameDetails', '');
      App.selectedGameId = parseInt(gameIdString);
      App.updateUi();
    });
  }

  static init() {
    Ui.init();
    App.setupHttpInterceptor();
    App.setupEventListeners();
  }
}

(function () {
  'use strict';

  fixTable();

  window.setInterval(fixTable, 3000);

  addPlayerSearch();

  $(document).ready(function() {
    App.init();
  });
})();

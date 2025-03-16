// ==UserScript==
// @name         Metalligaen.dk live feed optimizations
// @namespace    MetalligaenLive
// @version      2025-03-13
// @description  try to take over the world!
// @author       You
// @match        https://metalligaen.dk/live/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=metalligaen.dk
// @require      https://lars.hillsbrook.dk/tampermonkey-helpers.js
// @grant        none
// ==/UserScript==


/* jQuery */

$.fn.onClassChange = function(cb) {
  return $(this).each((_, el) => {
    new MutationObserver(mutations => {
      mutations.forEach(mutation => cb && cb(mutation.target, mutation.target.className));
    }).observe(el, {
      attributes: true,
      attributeFilter: ['class'] // only listen for class attribute changes 
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

Array.prototype.where = function(selector) {
  return this.filter(selector);
};

Array.prototype.forEachWithIndex = function(action) {
  for(var i = 0; i < this.length; i++) {
    action(i, this[i]);
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
  static setupLightningTab() {
    var isChecked = (localStorage.getItem('lightning-showDetails') ?? 'false') == 'true';

    // Insert new tab content
    var html = `
      <div class="tab__panel tab-pane" id="tab__panel-lightning" role="tabpanel" aria-labelledby="tab_nav-lightning">
        <div class="headline with-checkbox">
          HIGHLIGHTS
          <div class="checkbox-left">
            <label for="toggle-otlength">OT = 5 mins</label>
            <input type="checkbox" id="toggle-otlength"` + (App.overTimeIsFiveMinutes ? ' checked="checked"' : '') + `>
          </div>
          <div class="checkbox-right">
            <label for="toggle-details">Vis spillere</label>
            <input type="checkbox" id="toggle-details"` + (isChecked ? ' checked="checked"' : '') + `>
          </div>
        </div>
        <div class="player-table">
          <table>
            <tbody id="highlights-table" class="` + (!isChecked ? 'hide-details' : '') + `"></tbody>
          </table>
        </div>
        <div class="headline">POINT</div>
        <div id="point-summary" class="player-table"></div>
        <div class="headline">UDVISNINGER</div>
        <div id="penalty-summary" class="player-table"></div>
      </div>
    `;

    $('#nav-tabContent').prepend(html);

    $('#toggle-details').bind('click', e => {
      Ui.toggleDetails(e.target);
    });

    $('#toggle-otlength').bind('click', e => {
      App.toggleOvertimeLength(e.target);
    });

    // Insert new tab
    html = `
      <a class="tab__nav-item nav-item nav-link" id="tab_nav-lightning" data-toggle="tab" href="#tab__panel-lightning" role="tab" aria-controls="tab__panel-lightning" aria-selected="true">lightning</a>
    `;

    $('#nav-tab').prepend(html);
    $('#tab_nav-lightning').click();
  }

  static addPlayerSearchInLineupTab() {
    var css = `
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

  static getPenaltyHighlightHtml(gameTime, penaltyName, penaltyMinutes, team, player, hasMultipleHighlightsInSameTime) {
    return `
      <tr class="penalty">
        <td class="time">`+ gameTime + ` (` + App.getTimeRemaining(gameTime) + `)` + (hasMultipleHighlightsInSameTime ? ` *` : ``) + `</td>
        <td>` + penaltyName + `</td>
        <td class="center">` + penaltyMinutes + ` mins</td>
        <td>` + team + `</td>
      </tr>
      <tr class="players">
        <td></td>
        <td colspan="3">` + player + `</td>
      </tr>
    `;
  }

  static getGoalHighlighHtml(gameJson, gameTime, team, goalType, score, scorer, assist1, assist2, hasMultipleHighlightsInSameTime) {
    var players = scorer;

    if(assist1) {
      players += '<br>' + assist1;
    }

    if(assist2) {
      players += '<br>' + assist2;
    }

    var isScoredByHomeTeam = gameJson.homeTeamName.startsWith(team);
    var homeScore = score.split(' - ')[0];
    var awayScore = score.split(' - ')[1];

    var scoreHtml = isScoredByHomeTeam
      ? '<span>' + homeScore + '</span> - ' + awayScore
      : homeScore + ' - <span>' + awayScore + '</span>';

    return `
      <tr class="goal">
        <td class="time">`+ gameTime + ` (` + App.getTimeRemaining(gameTime) + `)` + (hasMultipleHighlightsInSameTime ? ` *` : ``) + `</td>
        <td>` + scoreHtml + `</td>
        <td class="center">[` + goalType + `]</td>
        <td>` + team + `</td>
      </tr>
      <tr class="players">
        <td></td>
        <td colspan="3">` + players + `</td>
      </tr>
    `;
  }

  static updateHighlights(gameJson) {
    var html = '';

    // Remove 'Udvisningen til ... er slut'
    var highlights = gameJson.highlights
      .where(o => {
        var shouldBeRemoved = o.eventText.match("^Udvisningen til .* er slut.$");
        return !shouldBeRemoved;
      })
      .reverse();
    
    var previousPeriod = '';

    highlights.forEachWithIndex((index, o) => {
      var thisPeriod = App.getPeriod(o.gameTime);
      var hasMultipleHighlightsInSameTime = App.hasMultipleHighlightsInSameTime(highlights, index);

      // Insert period
      if(thisPeriod != previousPeriod) {
        html += `
          <tr class="period">
            <td colspan="4">` + thisPeriod + `</td>
          </tr>
        `;

        previousPeriod = thisPeriod;
      }

      // Example: I tiden 12:30 udvises #44 Oliver True fra Herlev Eagles 2 minutter for slashing.
      var m = o.eventText.match("^I tiden .+? udvises (.+?) fra (.+?) ([0-9]+) minutter for (.+?)\\.$");

      if(m) {
        var player = m[1];
        var team = m[2].split(' ')[0];
        var penaltyMinutes = m[3];
        var penaltyName = m[4];

        html += Ui.getPenaltyHighlightHtml(o.gameTime, penaltyName, penaltyMinutes, team, player, hasMultipleHighlightsInSameTime);

        return;
      }
      
      // Example: I tiden 12:23 scorer Herlev Eagles til stillingen 3 - 0\\. Målet blev scoret af spiller #44 Oliver True, assisteret af #19 Mathias Asperup og af #1 Emil Zetterquist. [EQ]
      m = o.eventText.match("^I tiden .+? scorer (.+?) til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?) og af (.+?)\\. \\[(.+?)\\]$");

      if(m) {
        var team = m[1].split(' ')[0];
        var score = m[2];
        var scorer = m[3];
        var assist1 = m[4];
        var assist2 = m[5];
        var goalType = m[6];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, assist1, assist2, hasMultipleHighlightsInSameTime);
        
        return;
      }
      
      // Example: I tiden 12:23 scorer Herlev Eagles til stillingen 3-0. Målet blev scoret af spiller #44 Oliver True, assisteret af #19 Mathias Asperup. [SH1]
      m = o.eventText.match("^I tiden .+? scorer (.+?) til stillingen (.+?)\\. Målet blev scoret af spiller (.+?), assisteret af (.+?)\\. \\[(.+?)\\]$");

      if(m) {
        var team = m[1].split(' ')[0];
        var score = m[2];
        var scorer = m[3];
        var assist1 = m[4];
        var goalType = m[5];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, assist1, null, hasMultipleHighlightsInSameTime);
        
        return;
      }

      // Example: I tiden 12:23 scorer Herlev Eagles til stillingen 3-0. Målet blev scoret af spiller #44 Oliver True. [PP1]
      m = o.eventText.match("^I tiden .+? scorer (.+?) til stillingen (.+?)\\. Målet blev scoret af spiller (.+?)\\. \\[(.+?)\\]$");

      if(m) {
        var team = m[1].split(' ')[0];
        var score = m[2];
        var scorer = m[3];
        var goalType = m[4];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, null, null, hasMultipleHighlightsInSameTime);
        
        return;
      }

      // Example: 0 - 1: (02:32) SønderjyskE Ishockey [EQ]. #27 Mathias Borring Hansen (uassisteret)
      m = o.eventText.match("^(.+?): \\(.+?\\) (.+?) \\[(.+?)\\]\\. (.+?) \\(uassisteret\\)$");

      if(m) {
        var team = m[2].split(' ')[0];
        var score = m[1];
        var scorer = m[4];
        var goalType = m[3];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, null, null, hasMultipleHighlightsInSameTime);

        return;
      }

      // Example: 0 - 3: (05:10) SønderjyskE Ishockey [EQ]. #3 Mathias Kløve Mogensen (#9 Cameron Brown, #27 Mathias Borring Hansen)
      m = o.eventText.match("^(.+?): \\(.+?\\) (.+?) \\[(.+?)\\]\\. (.+?) \\((.*?), (.*?)\\)$");

      if(m) {
        var team = m[2].split(' ')[0];
        var score = m[1];
        var scorer = m[4];
        var assist1 = m[5];
        var assist2 = m[6];
        var goalType = m[3];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, assist1, assist2, hasMultipleHighlightsInSameTime);

        return;
      }

      // Example: 0 - 1: (02:32) SønderjyskE Ishockey [EQ]. #27 Mathias Borring Hansen (#9 Cameron Brown)
      m = o.eventText.match("^(.+?): \\(.+?\\) (.+?) \\[(.+?)\\]\\. (.+?) \\((.*?)\\)$");

      if(m) {
        var team = m[2].split(' ')[0];
        var score = m[1];
        var scorer = m[4];
        var assist1 = m[5];
        var goalType = m[3];

        html += Ui.getGoalHighlighHtml(gameJson, o.gameTime, team, goalType, score, scorer, assist1, null, hasMultipleHighlightsInSameTime);

        return;
      }

      html += `
        <tr class="penalty">
          <td class="time">`+ o.gameTime + ` (` + App.getTimeRemaining(o.gameTime) + `)</td>
          <td>ERROR</td>
          <td class="center"></td>
          <td></td>
        </tr>
      `;
    });

    $('#highlights-table').empty();
    $('#highlights-table').append(html);
  }

  static update(gameJson) {
    Ui.updatePenaltySummary(gameJson);
    Ui.updatePointSummary(gameJson);
    Ui.updateHighlights(gameJson);
  }

  static toggleDetails(checkbox) {
    var isChecked = $(checkbox).is(':checked');
    
    if(isChecked) {
      $('#highlights-table').removeClass('hide-details');
    } else {
      $('#highlights-table').addClass('hide-details');
    }

    localStorage.setItem('lightning-showDetails', isChecked.toString());
  }

  static init() {
    Page.importCss(`
      #nav-tabContent {
        padding: 0;
        background: inherit;
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
      
      .headline.with-checkbox {
        position: relative;
      }
      
        .headline.with-checkbox div {
          display: flex;  
          position: absolute;
          top: 10px;
          font-weight: normal;
          font-size: 13px;
          color: #5d5d5d;
        }

        .headline.with-checkbox div.checkbox-left {
          left: 13px;
        }

        .headline.with-checkbox div.checkbox-right {
          right: 13px;
        }

        .headline.with-checkbox input {
          margin-left: 8px;
        }

        .headline.with-checkbox label {
          margin: 0;
        }
      
      #highlights-table {

      }

        #highlights-table tr.period {
          text-transform: uppercase;
          font-weight: bold;
          color: #000;
        }

          #highlights-table tr.period td {
            padding: 12px 0 5px;
            text-align: center;
          }

          #highlights-table tr.period:first-of-type td {
            padding-top: 0;
          }
        
        #highlights-table tr.penalty {
          font-weight: bold;
          color: #cf0d26;
        }

        #highlights-table tr.players {
          color: #737373;
        }

          #highlights-table tr.players td {
            padding-bottom: 10px;
            font-size: 0.9em;
          }

          #highlights-table.hide-details tr.players {
            display: none;
          }

        #highlights-table tr.goal {
          font-weight: bold;
          color: #006b84;
        }

          #highlights-table tr.goal span {
            font-weight: bold;
            text-decoration: underline;
          }

        #highlights-table td.time {
          white-space: nowrap;
        }
        
        #highlights-table.hide-details td {
          padding-bottom: 2px;
        }
    `);
  }
}

class App {
  static latestReceivedJsonGames = '';
  static selectedGameId = 0;
  static overTimeIsFiveMinutes = true;

  static toggleOvertimeLength(checkbox) {
    App.overTimeIsFiveMinutes = $(checkbox).is(':checked');
    App.updateUi();

    localStorage.setItem('lightning-overTimeIsFiveMinutes', App.overTimeIsFiveMinutes.toString());
  }

  static hasMultipleHighlightsInSameTime(highlights, index) {
    var currentTime = highlights[index].gameTime;
    var result = false;

    if(index > 0) {
      var previousTime = highlights[index - 1].gameTime;

      if(previousTime == currentTime) {
        result = true;
      }
    }

    if(highlights.length > index + 1) {
      var nextTime = highlights[index + 1].gameTime;

      if(nextTime == currentTime) {
        result = true;
      }
    }

    return result;
  }

  static getTimeRemaining(timeString) {
    var minutesString = timeString.split(':')[0];
    var secondsString = timeString.split(':')[1];
    var totalSeconds = parseInt(minutesString) * 60 + parseInt(secondsString);
    var totalSecondsLeftInPeriod = totalSeconds % (20 * 60);

    var isOvertime = totalSeconds > 60*60;
    var periodLength = 20;
    
    // 5 minute overtime
    if(isOvertime && App.overTimeIsFiveMinutes) {
      periodLength = 5;
    }

    if(totalSecondsLeftInPeriod == 0) {
      return '00:00';
    }
    
    var remainingTotalSeconds = periodLength * 60 - totalSecondsLeftInPeriod;
    var remainingMinutes = Math.floor(remainingTotalSeconds / 60);
    var remainingSeconds = remainingTotalSeconds - remainingMinutes * 60;
    var timeString = remainingMinutes.toString().padStart(2, '0') + ':' + remainingSeconds.toString().padStart(2, '0');

    return timeString;
  }

  static getPeriod(timeString) {
    var minutesString = timeString.split(':')[0];
    var secondsString = timeString.split(':')[1];
    var totalSeconds = parseInt(minutesString) * 60 + parseInt(secondsString);

    if(totalSeconds == 0) {
      return '1. periode';
    }

    var isOvertime = totalSeconds > 60*60;

    if(isOvertime && App.overTimeIsFiveMinutes) {
      return 'overtid';
    }

    var periodNumber = Math.ceil(totalSeconds / (20*60));
    return periodNumber.toString() + '. periode';
  }

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
      if(g.goals == null) {
        g.goals = [];
      }

      if(g.penalties == null) {
        g.penalties = [];
      }

      if(g.highlights == null) {
        g.highlights = [];
      }

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
    if($('section.live-score').length == 0) {
      setTimeout(App.setupEventListeners, 1000);
      return;
    }

    // When a game is selected, update our ui.
    $("section.live-score").onClassChange((obj, newClass) => {
      if(newClass.indexOf('live-score--active') > -1) {
        var gameIdString = $(obj).attr('id');
        
        console.log('Selected game id ' + gameIdString);
  
        App.selectedGameId = parseInt(gameIdString);
        App.updateUi();
      }
    });
  }

  static setupLightningTab() {
    if($('#nav-tab').length == 0) {
      setTimeout(App.setupLightningTab, 1000);
      return;
    }

    Ui.setupLightningTab();
  }

  static loadSettingsFromLocalStorage() {
    App.overTimeIsFiveMinutes = (localStorage.getItem('lightning-overTimeIsFiveMinutes') ?? 'true') == 'true';
  }

  static init() {
    Ui.init();
    App.loadSettingsFromLocalStorage();
    App.setupHttpInterceptor();
    App.setupEventListeners();
    App.setupLightningTab();
    Ui.addPlayerSearchInLineupTab();
  }
}

(function () {
  'use strict';

  $(document).ready(function() {
    App.init();
  });
})();

// ==UserScript==
// @name        War Base Extended
// @namespace   vinkuun.warBaseExtended
// @author      Vinkuun [1791283]
// @description Brings back the old war base layout, adds a filter to the war base, enables enemy tagging
// @include     *.torn.com/factions.php?step=your*
// @version     2.3.0
// @grant       none
// @require     http://cdnjs.cloudflare.com/ajax/libs/lodash.js/2.4.1/lodash.min.js
// ==/UserScript==

// TODO: update mechanism: changelog/localStorage clean up

'use strict';

var $MAIN = $('#faction-main');

var ENEMY_TAGS = {
  tbd: {text: 'Not set'},
  easy: {text: 'Easy', color:'rgba(161, 248, 161, 1)'},
  medium: {text: 'Medium', color:'rgba(231, 231, 104, 1)'},
  impossible: {text: 'Impossible', color:'rgba(242, 140, 140, 1)'}
};

var enemyTags = JSON.parse(localStorage.vinkuunEnemyTags || '{}');

// Config for personal stats

/**
 * Transforms the stat to a decimal number. Stripped characters: ,$
 * @param  {string} text Value of the stat
 * @return {number}      decimal number
 */
function parseNumber(text) {
  return parseFloat(text.replace(/[\$,]/g, ''), 10);
}
var PERSONAL_STATS = [
  'Attacks won',
  'Attacks lost',
  'Attacks stalemated',
  'Defends won',
  'Defends lost',
  'Defends stalemated',
  'Win/Loss ratio',
  'Times ran away',
  'Foes ran away',
  'Best kill streak',
  'Critical hits',
  'Rounds fired',
  'Stealth attacks',
  'Money mugged',
  'Largest mug',
  'Highest level beaten',
  'Total respect gained',
  'Items bought from market',
  'Auctions won',
  'Points bought',
  'Items auctioned',
  'Points sold',
  'Items bought from Big Al\'s',
  'Items sent',
  'Trades made',
  'Bazaar customers',
  'Bazaar sales',
  'Bazaar income',
  'Times jailed',
  'People busted',
  'Failed busts',
  'People bailed',
  'Bail fees',
  'Times in hospital',
  'Medical items used',
  'People revived',
  'Revives received',
  'Medical items stolen',
  'Heavy artillery',
  'Machine guns',
  'Rifles',
  'Sub machine guns',
  'Shotguns',
  'Pistols',
  'Temporary weapons',
  'Piercing weapons',
  'Slashing weapons',
  'Clubbed weapons',
  'Machinery',
  'Mails sent',
  'Mails sent to friends',
  'Mails sent to faction',
  'Mails sent to colleagues',
  'Mails sent to spouse',
  'Classified ads placed',
  'Personals placed',
  'Criminal offences',
  'Selling illegal goods',
  'Theft',
  'Auto theft',
  'Drug deals',
  'Computer crimes',
  'Fraud',
  'Murder',
  'Other',
  'Bounties placed',
  'Spent on bounties',
  'Bounties collected',
  'Money rewarded',
  'Bounties received',
  'Items found',
  'Items trashed',
  'Dump searches',
  'Items found in dump',
  'Times travelled',
  'Items bought abroad',
  'Hunting skill',
  'Argentina',
  'Mexico',
  'Dubai',
  'Hawaii',
  'Japan',
  'United Kingdom',
  'South Africa',
  'Switzerland',
  'China',
  'Canada',
  'Cayman Islands',
  'Drugs used',
  'Times overdosed',
  'Cannabis taken',
  'Ecstasy taken',
  'Ketamine taken',
  'LSD taken',
  'Opium taken',
  'Shrooms taken',
  'Speed taken',
  'PCP taken',
  'Xanax taken',
  'Vicodin taken',
  'Logins',
  //'Time played',
  'Merits bought',
  'Energy refills',
  'Times trained by director',
  'Army spying',
  'Stat enhancers used',
  'Viruses coded',
  'Days been a donator',
  'Times voted'
];

// ============================================================================
// --- Helper functions
// ============================================================================

/**
 * Adds CSS to the HEAD of the document
 * @param {string} css
 */
function addCss(css) {
  var head = document.head,
    style = document.createElement('style');

  style.type = 'text/css';
  style.appendChild(document.createTextNode(css));

  head.appendChild(style);
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

// ============================================================================
// --- Personal stats helper function
// ============================================================================

/**
 * Returns the personal stats of a player
 * @param  {String} id         ID of the player
 * @param  {Function} callback Function which should be called after the stats have been read
 */
function updatePlayerStats(id) {
  return $.ajax({type: 'GET', url: 'personalstats.php?ID=' + id}).then(function(page) {
    var $page = $(page);

    var personalStats = {};

    $page.find('.statistic ul.right li').each(function() {
      var name = this.children[0].innerHTML;
      name = name.slice(0, name.length - 1); // remove colon

      // if this is a known stat => add to return data
      if (_(PERSONAL_STATS).contains(name)) {
        personalStats[name] = parseNumber(this.children[1].textContent);
      }
    });

    setPlayerStats(id, {personalStats: personalStats});
  });
}

var cachedPlayerStats = {};

function setPlayerStats(id, stats) {
  stats.date = new Date().getTime();

  localStorage['vinkuun.stats.' + id] = JSON.stringify(stats);
  cachedPlayerStats[id] = stats;
}

function getPlayerStats(id) {
  return cachedPlayerStats[id] || JSON.parse(localStorage['vinkuun.stats.' + id]);
}

// ============================================================================
// --- FEATURE: War Base Layout
// ============================================================================
function enableWarBaseLayout() {
  addCss(
    '.oldWarBase .f-war-list { margin-top: 10px }' +
    '.oldWarBase .f-war-list > li, .oldWarBase .f-war-list > li.first-in-row { margin: 10px 0; padding: 0; height: auto; width: auto }' +
    '.oldWarBase .f-war-list > li .status-wrap { display: none }' +
    '.oldWarBase .f-war-list > li .desc-wrap { display: block !important }' +
    '.oldWarBase .first-in-row { margin: 0; padding: 0 }'
  );

  $MAIN.addClass('oldWarBase');
}

// ============================================================================
// --- FEATURE: Collapsible war base
// ============================================================================
function makeWarBaseCollapsible() {
  var $warList = $('.f-war-list');
  var $statusElement = $('<p>', {text: 'The war base is currently hidden. Click the bar above to show it.', style: 'text-align: center; margin-top: 4px; font-weight: bold'}).hide();

  $('.f-msg')
  .css('cursor', 'pointer')
  .on('click', function() {
    if (shouldHideWarBase()) {
      localStorage.vinkuunHideWarBase = false;
      $warList.show();
      $statusElement.hide();
    } else {
      localStorage.vinkuunHideWarBase = true;
      $warList.hide();
      $statusElement.show();
    }})
  .attr('title', 'Click to show/hide the war base')
  .after($statusElement);

  if (shouldHideWarBase()) {
    $warList.hide();
    $statusElement.show();
  }
}

// returns true if the layout is enabled, false if not
function shouldHideWarBase() {
  return JSON.parse(localStorage.vinkuunHideWarBase || 'false');
}

// ============================================================================
// --- FEATURE: War base filter
// ============================================================================
function FilterManager(options) {
  var _filters = {};
  var _rows = [];
  var _config = JSON.parse(localStorage[options.configKey] || '{}');

  var that = this;

  this.showRow = options.showRow;
  this.hideRow = options.hideRow;

  this.$hiddenCount = $('<span>', {text: 0});

  /**
   * Applies a list of filters to the rows
   * @param  {array} filters Filters to apply
   */
  var applyFilters = function(activeFilters) {
    var numOfHiddenRows = 0;

    _(_rows).forEach(function(row) {
      // apply each supplied filter
      _(activeFilters).each(function(filter) {
        if (filter.test(row.rowData, _config[filter.id])) {
          row.activeFilters[filter.id] = true;
        } else {
          delete row.activeFilters[filter.id];
        }
      });

      if (_.keys(row.activeFilters).length === 0) {
        // show the row if no filter applies to it
        that.showRow(row.originalRow);
      } else {
        // hide the row if there is at least one filter applying to it
        that.hideRow(row.originalRow);

        numOfHiddenRows++;
      }
    });

    that.$hiddenCount.text(numOfHiddenRows);
  };

  this.trigger = function(filterId) {
    applyFilters([_filters[filterId]]);
  };

  this.triggerAll = function() {
    applyFilters(_.values(_filters));
  };

  this.registerFilter = function(id, testFunction, initialConfig) {
    if (_config[id] === undefined) {
      _config[id] = initialConfig;
    }

    _filters[id] = new Filter(id, testFunction);
  };

  this.rowToData = options.rowToData || function(row) { return row; };

  this.addRow = function(row) {
    _rows.push({
      rowData: that.rowToData(row),
      originalRow: row,
      activeFilters: {}
    });
  };

  /**
   * 1. Returns the config of a filter, if called with only the 1st argument
   * 2. If both arguments are supplied: merges old and new filter config
   * 
   * @param  {String} id           filter id
   * @param  {Object} filterConfig new filter config
   * @return {Object}              current filter config
   */
  this.config = function(id, newConfig) {
    if (newConfig !== undefined) {
      _.assign(_config[id], newConfig);
      this.saveConfig();
    } else {
      return _config[id];
    }
  };

  this.getRowData = function() {
    return _.pluck(_rows, 'rowData');
  };

  this.saveConfig = function() {
    localStorage[options.configKey] = JSON.stringify(_config);
  };
}

function Filter(id, test) {
  this.id = id;
  this.test = test;
}

/**
 * Adds the filter panel to the war base extended main panel
 * @param {jQuery-Object} $panel Main panel
 */
function addWarBaseFilter($panel) {
  addCss(
    '#vinkuun-extendedWarBasePanel { line-height: 2em; padding: 4px }' +
    '#vinkuun-extendedWarBasePanel div { margin: 2px 0 }' +
    '#vinkuun-extendedWarBasePanel label { background-color: rgba(200, 195, 195, 1); padding: 4px 6px; margin: 0 4px; border: 1px solid #808080; border-radius: 5px }' +
    '#vinkuun-extendedWarBasePanel input { margin-right: 5px; border: 1px solid #808080 }' +
    '#vinkuun-extendedWarBasePanel input[type="text"] { line-height: 1.5em; width: 50px }' +
    '#vinkuun-extendedWarBasePanel input[type="checkbox"] { vertical-align: text-bottom }' +
    '#vinkuun-extendedWarBasePanel .clickable:hover { cursor: pointer }'
  );

  var filterManager = new FilterManager({
    rowToData: function(row) {
      var data = {};

      data.id = row.children[0].children[2].children[0].href.match(/XID=(\d+)/)[1];
      data.status = row.children[3].children[0].textContent;

      if (data.status === 'Hospital') {
        data.hospitalTimeLeft = parseRemainingHospitalTime(row.children[1].querySelector('#icon15').title);
      }

      return data;
    },
    showRow: function(rowElement) {
      rowElement.style.display = 'block';
    },
    hideRow: function(rowElement) {
      rowElement.style.display = 'none';
    },
    configKey: 'vinkuun.warBase.filters'
  });

  // add each <li>-element of a player to the FilterManager
  $MAIN.find('ul.f-war-list ul.member-list > li').each(function() {
    filterManager.addRow(this);
  });

  filterManager.registerFilter('statusOk',
    function(player, config) {
      return config.active && player.status === 'Okay';
    },
    {active: false}
  );

  filterManager.registerFilter('statusTraveling',
    function(player, config) {
      return config.active && player.status === 'Traveling';
    },
    {active: false}
  );

  filterManager.registerFilter('statusHospital',
    function(player, config) {
      return config.active && player.status === 'Hospital' && config.hospitalTimeLeft < player.hospitalTimeLeft;
    },
    {active: false, hospitalTimeLeft: ''}
  );

  filterManager.registerFilter('difficulty',
    function(player, config) {
      var playerDifficulty = enemyTags[player.id] || 'tbd';

      return config[playerDifficulty] || false;
    },
    {}
  );

  filterManager.registerFilter('personalStats',
    function(player, config) {
      if (config.active) {
        var stats = getPlayerStats(player.id);
        if (stats) {
          var hidePlayer = false;

          _(config.stats).each(function(lowerBound, statName) {
            if (lowerBound < stats.personalStats[statName]) {
              hidePlayer = true;
              return false; // break each
            }
          });

          return hidePlayer;
        } else {
          return false;
        }
      } else {
        return false;
      }
    },
    {active: false, stats: {'Attacks won': 1000, 'Xanax taken': 500}} // stats will be combined with OR
  );

  // FILTER: status = ok
  var $statusOkFilter = $('<label>', {text: 'okay'}).prepend(
    $('<input>', {type: 'checkbox', checked: filterManager.config('statusOk').active})
      .on('change', function() {
        filterManager.config('statusOk', {active: this.checked});
        filterManager.trigger('statusOk');
      })
  );

  // FILTER: status = traveling
  var $statusTravelingFilter = $('<label>', {text: 'traveling'}).prepend(
    $('<input>', {type: 'checkbox', checked: filterManager.config('statusTraveling').active})
      .on('change', function() {
        filterManager.config('statusTraveling', {active: this.checked});
        filterManager.trigger('statusTraveling');
      })
  );

  // FILTER: status = hospital
  var $statusHospitalFilter = $('<label>', {text: 'in hospital for more than ', title: 'Leave this field blank to disable this filter'})
    .append(
      $('<input>', {type: 'text', style: 'width: 50px', value: filterManager.config('statusHospital').hospitalTimeLeft})
        .on('change', function() {
          if (isNaN(this.value)) {
            filterManager.config('statusHospital', {active: false, hospitalTimeLeft: ''});
          } else {
            filterManager.config('statusHospital', {active: true, hospitalTimeLeft: parseInt(this.value, 10)});
          }

          filterManager.trigger('statusHospital');
        }))
    .append(' minutes');

  // FILTER: difficulty
  var $difficultyFilter = $('<div>').append($('<span>', {text: 'Hide enemies with a difficulty of '}));
  var changeCallback = function() {
    filterManager.config('difficulty')[this.value] = this.checked;
    filterManager.saveConfig();
    filterManager.trigger('difficulty');
  };
  _(ENEMY_TAGS).forEach(function(tag, difficulty) {
    $difficultyFilter.append(
      $('<label>', {text: tag.text})
        .prepend(
          $('<input>', {type: 'checkbox', value: difficulty, checked: filterManager.config('difficulty')[difficulty] || false})
            .on('change', changeCallback)
        )
    );
  });

  // FILTER: personal stats
  var personalStatsFilterCreateLabel = function(statValue, statName) {
    var $label = $('<label>');

    var $statValueField = $('<input>', {type: 'text', value: statValue})
      .on('keyup', function() {
        var newValue = this.value;

        if (newValue !== '' && isNumber(newValue)) {
          filterManager.config('personalStats').stats[statName] = parseInt(newValue, 10);
          this.style.border = '';
        } else {
          this.style.border = '1px solid red';
        }
        
        filterManager.saveConfig();
        filterManager.trigger('personalStats');
      });

    var $deleteStatButton = $('<span>', {text: '[X]', class: 'clickable'}).on('click', function() {
      // enable stat in select
      delete filterManager.config('personalStats').stats[statName];
      filterManager.saveConfig();
      $label.remove();
    });

    $label
      .append(statName + ': ')
      .append($statValueField)
      .append($deleteStatButton);

    return $label;
  };
  var $personalStatsFilter = $('<div>').append(($('<p>', {text: 'Personal Stats filter'})));

  var $personalStatsUpdateProgress = $('<span>');
  $('<button>', {text: 'Update stats'})
    .appendTo($personalStatsFilter)
    .after($personalStatsUpdateProgress)
    .on('click', function() {
      $personalStatsUpdateProgress.text('Updating - please wait...');

      var rowData = filterManager.getRowData();

      var tasks = _.map(rowData, function(player, index) {
        return updatePlayerStats(player.id);
      });

      Promise.all(tasks).then(function() {
        $personalStatsUpdateProgress.text('All stats are now up-to-date.');

        filterManager.trigger('personalStats');
      });
    });

  // construct select panel
  var $personalStatsSelectPanel = $('<div>').appendTo($personalStatsFilter);
  var $personalStatsActiveFilters = $('<div>').appendTo($personalStatsFilter);

  var $personalStatsSelect = $('<select>').appendTo($personalStatsSelectPanel);

  var alreadyAddedStats = _.map(filterManager.config('personalStats').stats, function(statValue, statName) { return statName; });

  _(PERSONAL_STATS).each(function(statName) {
    $personalStatsSelect.append($('<option>', {text: statName, disabled: _.contains(alreadyAddedStats, statName)}));
  });

  $('<button>', {text: 'add this stat'})
    .appendTo($personalStatsSelectPanel)
    .on('click', function() {
      var $selectedOption = $personalStatsSelect.find(':selected');

      var statValue = '';
      var statName = $selectedOption.text();

      // add stat to active filters
      $personalStatsActiveFilters.append(personalStatsFilterCreateLabel(statValue, statName));

      
      $selectedOption.prop('disabled', true);
      $selectedOption.prop('selected', false);
    });  

  _(filterManager.config('personalStats').stats).each(function(statValue, statName) {
    $personalStatsActiveFilters.append(personalStatsFilterCreateLabel(statValue, statName));
  });

  $panel
    .append($('<div>').append(filterManager.$hiddenCount).append($('<span>', {text: ' enemies are hidden by the filter.'})))
    .append($('<div>')
      .append($('<span>', {text: 'Hide enemies who are '}))
      .append($statusOkFilter).append(' or ')
      .append($statusTravelingFilter).append(' or ')
      .append($statusHospitalFilter))
    .append($difficultyFilter)
    .append($personalStatsFilter);

  filterManager.triggerAll();
}

/**
 * Returns the remaining hospital time in minutes
 * 
 * @param  {String} text The tooltip text of the hospital icon
 * @return {Integer}
 */
function parseRemainingHospitalTime(text) {
  var match = text.match(/<br>(\d{2}):(\d{2}):/);

  return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
}

// ============================================================================
// --- FEATURE: Enemy tagging
// ============================================================================
 
function addEnemyTagging() {
  addCss(
    'select.vinkuun-enemyDifficulty { font-size: 12px; vertical-align: text-bottom }' +
    '.member-list li div.status, .member-list li div.act-cont { font-weight: bold }'
  );

  $MAIN.find('.member-list > li').each(function() {
    var $this = $(this);

    var id = $this.find('.user.name').eq(0).attr('href').match(/XID=(\d+)/)[1];

    $this.find('.member-icons').prepend(createDropdown($this, id));
  });
}

function createDropdown($li, id) {
  var $dropdown = $('<select>', {'class': 'vinkuun-enemyDifficulty'}).on('change', function() {
    enemyTags[id] = this.value;

    localStorage.vinkuunEnemyTags = JSON.stringify(enemyTags);

    updateColor($li, id);
  });

  $.each(ENEMY_TAGS, function(key, value) {
    var $el = $('<option>', {value: key, text: value.text});

    if (enemyTags[id] && key === enemyTags[id]) {
      $el.attr('selected', 'selected');
    }

    $dropdown.append($el);
  });

  updateColor($li, id);

  return $dropdown;
}

function updateColor($li, id) {
  if (enemyTags[id]) {
    // set a color or remove this rule
    $li.css('background-color', ENEMY_TAGS[enemyTags[id]].color || '');
  }
}

// ============================================================================
// --- MAIN
// ============================================================================

/**
 * Shows/Hides the control panel according to the current tab
 * @param {jQuery-Object} $element control panel
 */
function addUrlChangeCallback($element) {
  var urlChangeCallback = function () {
    if (window.location.hash === '#/tab=main' || window.location.hash === '') {
      $element.show();
    } else {
      $element.hide();
    }
  };

  // call it one time to show/hide the panel after the page has been loaded
  urlChangeCallback();

  // listen to a hash change
  window.onhashchange = urlChangeCallback;
}

/**
 * Initialises the script's features
 */
function init() {
  var $warBaseExtendedPanel = $('#vinkuun-extendedWarBasePanel');

  if ($warBaseExtendedPanel.length !== 0) {
    $warBaseExtendedPanel.empty();
  } else {
    $warBaseExtendedPanel = $('<div>', { id:'vinkuun-extendedWarBasePanel' });
    $MAIN.before($warBaseExtendedPanel);
  }

  var $title = $('<div>', { 'class': 'title-black m-top10 title-toggle tablet active top-round', text: 'War Base Extended' });
  $MAIN.before($title);

  var $panel = $('<div>', { 'class': 'cont-gray10 bottom-round cont-toggle' });
  $MAIN.before($panel);

  $warBaseExtendedPanel.append($title).append($panel);

  enableWarBaseLayout();
  makeWarBaseCollapsible();
  addWarBaseFilter($panel);
  addEnemyTagging();

  addUrlChangeCallback($warBaseExtendedPanel);
}


try {
  // observer used to apply the filter after the war base was loaded via ajax
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // The war base has been added to the div
      if (mutation.addedNodes.length === 18) {
        init();
      }
    });
  });

  // start listening for changes
  observer.observe($MAIN[0], { childList: true });
} catch (err) {
  console.log(err);
}

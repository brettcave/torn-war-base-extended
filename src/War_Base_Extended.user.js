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

// global CSS
addCss(
  '#vinkuun-extendedWarBasePanel { line-height: 2em }' +
  '#vinkuun-extendedWarBasePanel label { background-color: rgba(200, 195, 195, 1); padding: 2px; border: 1px solid #fff; border-radius: 5px }' +
  '#vinkuun-extendedWarBasePanel input { margin-right: 5px; vertical-align: text-bottom }' +
  '#vinkuun-extendedWarBasePanel input[type="number"] { vertical-align: baseline; line-height: 1.3em }' +
  '#vinkuun-extendedWarBasePanel { padding: 4px; }'
);

var $MAIN = $('#faction-main');

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

// ============================================================================
// --- Personal stats helper function
// ============================================================================

/**
 * Returns the personal stats of a player
 * @param  {String} id         ID of the player
 * @param  {Function} callback Function which should be called after the stats have been read
 */
function getPersonalStats(id, callback) {
  var stats = {};

  $.ajax({
    type: 'GET',
    url: 'personalstats.php?ID=' + id,
    success: function(page) {
      var $page = $(page);

      var stats = {};

      $page.find('.statistic ul.right li').each(function() {
        var name = this.children[0].innerHTML;
        name = name.slice(0, name.length - 1); // remove colon

        stats[name] = this.children[1].textContent;
      });

      callback(stats);
    }
  });
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
var warBaseFilter;
var $filterStatusElement;

/**
 * Adds the filter panel to the war base extended main panel
 * @param {jQuery-Object} $panel Main panel
 */
function addWarBaseFilter($panel) {
  var filterManager = new FilterManager({
    rowToData: function(row) {
      var data = {};

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
    config: loadFilterConfig()
  });

  filterManager.registerFilter(new Filter({
    id: 'statusOk',
    element: function() {
      var thisFilter = this;

      var $okayCheckbox = $('<input>', {type: 'checkbox'})
        .on('change', function() {
          thisFilter.config = {active: this.checked};
          thisFilter.callback(thisFilter);
        });

      $okayCheckbox[0].checked = thisFilter.config.active || false;

      return $('<label>', {text: 'okay'}).prepend($okayCheckbox);
    },
    test: function(player) {
        return this.config.active && player.status === 'Okay';
    }
  }));

  filterManager.registerFilter(new Filter({
    id: 'statusTraveling',
    element: function() {
      var thisFilter = this;

      var $okayCheckbox = $('<input>', {type: 'checkbox'})
        .on('change', function() {
          thisFilter.config = {active: this.checked};
          thisFilter.callback(thisFilter);
        });

      $okayCheckbox[0].checked = thisFilter.config.active || false;

      return $('<label>', {text: 'traveling'}).prepend($okayCheckbox);
    },
    test: function(player) {
        return this.config.active && player.status === 'Traveling';
    }
  }));

  filterManager.registerFilter(new Filter({
    id: 'statusHospital',
    element: function() {
      var thisFilter = this;

      var $hospitalTextfield = $('<input>', {type: 'number', style: 'width: 50px', value: this.config.timeLeft || ''})
        .on('change', function() {
          if (isNaN(this.value)) {
            thisFilter.config = {active: false};
          } else {
            thisFilter.config = {active: true, timeLeft: parseInt(this.value, 10)};
            thisFilter.callback(thisFilter);
          }
        });
      return $('<label>', {text: 'in hospital for more than '})
        .append($hospitalTextfield)
        .append(' minutes');
    },
    test: function(player) {
        return this.config.active && player.status === 'Hospital' && player.hospitalTimeLeft > this.config.timeLeft;
    }
  }));

  // add each <li>-element of a player to the FilterManager
  $MAIN.find('ul.f-war-list ul.member-list > li').each(function() {
    filterManager.addRow(this);
  });

  $panel
    .append('Hide enemies who are ')
    .append(filterManager.getFilterElement('statusOk')).append(' or ')
    .append(filterManager.getFilterElement('statusTraveling')).append(' or ')
    .append(filterManager.getFilterElement('statusHospital'))
    .append(' (').append(filterManager.$hiddenCount).append(' enemies are hidden by the filter.)');

  filterManager.applyFilters();
}

function FilterManager(options) {
  var filters = {};
  var rows = [];
  var that = this;

  this.config = options.config;

  this.showRow = options.showRow;
  this.hideRow = options.hideRow;

  this.$hiddenCount = $('<span>', {text: 0});

  /**
   * Applies a list of filters to the rows
   * If no list is supplied, every registerered filter will be used
   * @param  {array} filters Filters to apply
   */
  this.applyFilters = function(activeFilters) {
    activeFilters = activeFilters || _.values(filters);

    var numOfHiddenRows = 0;

    _(rows).forEach(function(row) {
      // apply each supplied filter
      _(filters).each(function(filter) {
        if (filter.test(row.rowData)) {
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

  this.reapplyFilter = function(filter) {
    that.config[filter.id] = filter.config;

    storeFilterConfig(that.config);
    
    that.applyFilters([filter]);
  };

  this.registerFilter = function(filter) {
    filter.setup(that.config[filter.id], that.reapplyFilter);

    filters[filter.id] = filter;
  };

  this.rowToData = options.rowToData || function(row) { return row; };

  this.addRow = function(row) {
    rows.push({
      rowData: that.rowToData(row),
      originalRow: row,
      activeFilters: {}
    });
  };

  this.getFilterElement = function(id) {
    if (filters[id]) {
      return filters[id].element;
    }
    else {
      throw 'Invalid ID';
    }
  };
}

function Filter(options) {
  this.id = options.id;
  this.test = options.test;

  this.setup = function(config, callback) {
    this.config = config || {};
    this.callback = callback;

    this.element = options.element.apply(this);
  };
}

function loadFilterConfig() {
  return JSON.parse(localStorage['vinkuun.warBase.filters'] || '{}');
}

function storeFilterConfig(config) {
  localStorage['vinkuun.warBase.filters'] = JSON.stringify(config);
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

var TAGS = {
  tbd: {text: 'Difficulty', color: 'inherit'},
  easy: {text: 'Easy', color:'rgba(161, 248, 161, 1)'},
  medium: {text: 'Medium', color:'rgba(231, 231, 104, 1)'},
  impossible: {text: 'Impossible', color:'rgba(242, 140, 140, 1)'}
};

var enemyTags = JSON.parse(localStorage.vinkuunEnemyTags || '{}');
 
function addEnemyTagging() {
  addCss(
    'select.vinkuun-enemeyDifficulty { font-size: 12px; vertical-align: text-bottom }' +
    '.member-list li div.status, .member-list li div.act-cont { font-weight: bold }'
  );

  $MAIN.find('.member-list > li').each(function() {
    var $this = $(this);

    var id = $this.find('.user.name').eq(0).attr('href').match(/XID=(\d+)/)[1];

    $this.find('.member-icons').prepend(createDropdown($this, id));
  });
}

function createDropdown($li, id) {
  var $dropdown = $('<select>', {'class': 'vinkuun-enemeyDifficulty'}).on('change', function() {
    enemyTags[id] = $(this).val();

    localStorage.vinkuunEnemyTags = JSON.stringify(enemyTags);

    updateColor($li, id);
  });

  $.each(TAGS, function(key, value) {
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
    $li.css('background-color', TAGS[enemyTags[id]].color);
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

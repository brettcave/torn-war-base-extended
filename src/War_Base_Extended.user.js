// ==UserScript==
// @name        War Base Extended
// @namespace   vinkuun.warBaseExtended
// @author      Vinkuun [1791283]
// @description Brings back the old war base layout, adds a filter to the war base, enables enemy tagging
// @include     *.torn.com/factions.php?step=your*
// @version     2.2.0
// @require     http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @grant       GM_addStyle
// ==/UserScript==

'use strict';

this.$ = this.jQuery = jQuery.noConflict(true);

// global CSS
GM_addStyle(
  '#vinkuun-extendedWarBasePanel { line-height: 2em }' +
  '#vinkuun-extendedWarBasePanel label { background-color: rgba(200, 195, 195, 1); padding: 2px; border: 1px solid #fff; border-radius: 5px }' +
  '#vinkuun-extendedWarBasePanel input { margin-right: 5px; vertical-align: text-bottom }' +
  '#vinkuun-extendedWarBasePanel input[type="number"] { vertical-align: baseline; line-height: 1.3em }' +
  '#vinkuun-extendedWarBasePanel { padding: 4px; }'
);

var $MAIN = $('#faction-main');

// ============================================================================
// --- FEATURE: War Base Layout
// ============================================================================
function enableWarBaseLayout() {
  GM_addStyle(
    '.oldWarBase .f-war-list { margin-top: 10px }' +
    '.oldWarBase .f-war-list > li, .oldWarBase .f-war-list > li.first-in-row { margin: 10px 0; padding: 0; height: auto; width: auto }' +
    '.oldWarBase .f-war-list > li .status-wrap { display: none }' +
    '.oldWarBase .f-war-list > li .desc-wrap { display: block !important }' +
    '.oldWarBase .first-in-row { margin: 0; padding: 0 }'
  );

  $MAIN.addClass('oldWarBase');
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

  // load saved war base filter settings
  warBaseFilter = JSON.parse(localStorage.vinkuunWarBaseFilter || '{}');
  warBaseFilter.status = warBaseFilter.status || {};

  $filterStatusElement = $('<span>', {text: 0});

  addFilterPanel($panel);

  applyFilter();
}

// returns true if the layout is enabled, false if not
function shouldHideWarBase() {
  return JSON.parse(localStorage.vinkuunHideWarBase || 'false');
}

/**
 * Applys the filter to the war base
 * 
 * @param  {jquery-Object} $list
 * @param  {Object} filter
 */
function applyFilter() {
  var $list = $MAIN.find('ul.f-war-list');

  // show all members
  $list.find('li').show();

  var countFiltered = 0;
  var items;

  if (warBaseFilter.status.okay) {
    items = $list.find('span:contains("Okay")');
    countFiltered += items.length;

    items.parent().parent().hide();
  }

  if (warBaseFilter.status.traveling) {
    items = $list.find('span:contains("Traveling")');
    countFiltered += items.length;

    items.parent().parent().hide();
  }

  if (warBaseFilter.status.hospital) {
    $list.find('span:contains("Hospital")').each(function() {
      var $this = $(this);

      var $li = $this.parent().parent();

      var hospitalTimeLeft = remainingHospitalTime($li.find('.member-icons #icon15').attr('title'));

      if (hospitalTimeLeft > warBaseFilter.status.hospital) {
        countFiltered++;
        $li.hide();
      }
    });
  }

  // update the number of hidden members
  $filterStatusElement.text(countFiltered);
}

/**
 * Panel to configure the filter - will be added to the main panel
 */
function addFilterPanel($panel) {
  $panel.append("Hide enemies who are ");

  // status: traveling filter
  var $travelingCheckbox = $('<input>', {type: 'checkbox'})
    .on('change', function() {
      reapplyFilter({status: {traveling: this.checked}});
    });
  var $travelingElement = $('<label>', {text: 'traveling'}).prepend($travelingCheckbox);
  $panel.append($travelingElement).append(', ');

  // status: okay filter
  var $okayCheckbox = $('<input>', {type: 'checkbox'})
    .on('change', function() {
      reapplyFilter({status: {okay: this.checked}});
    });
  var $okayElement = $('<label>', {text: 'okay'}).prepend($okayCheckbox);
  $panel.append($okayElement).append(' or ');

  // status: hospital filter
  var $hospitalTextfield = $('<input>', {type: 'number', style: 'width: 50px'})
    .on('change', function() {
      if (isNaN(this.value)) {
        reapplyFilter({status: {hospital: false}});
      } else {
        reapplyFilter({status: {hospital: parseInt(this.value, 10)}});
      }
    });
  var $hospitalElement = $('<label>', {text: 'in hospital for more than '})
    .append($hospitalTextfield)
    .append(' minutes');
  $panel.append($hospitalElement);

  $panel.append(' (').append($filterStatusElement).append(' enemies are hidden by the filter.)');

  // set the states of the elements according to the saved filter
  $travelingCheckbox[0].checked = warBaseFilter.status.traveling || false;
  $okayCheckbox[0].checked = warBaseFilter.status.okay || false;
  $hospitalTextfield.val(warBaseFilter.status.hospital || '');
}

/**
 * Reapplies the war base filter - current settings will be merged with the new filter settings
 * @param  {Object} newFilter new filter settings
 */
function reapplyFilter(newFilter) {
  $.extend(true, warBaseFilter, newFilter);

  localStorage.vinkuunWarBaseFilter = JSON.stringify(warBaseFilter);

  applyFilter(warBaseFilter);
}

/**
 * Returns the remaining hospital time in minutes
 * 
 * @param  {String} text The tooltip text of the hospital icon
 * @return {Integer}
 */
function remainingHospitalTime(text) {
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
  GM_addStyle(
    'select.vinkuun-enemeyDifficulty { font-size: 12px; vertical-align: text-bottom }' +
    '.member-list li div.status, .member-list li div.act-cont { font-weight: bold }'
  );

  var $list = $MAIN.find('.member-list > li').each(function() {
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
  addWarBaseFilter($panel);
  addEnemyTagging();

  addUrlChangeCallback($warBaseExtendedPanel);
}


try {
  // observer used to apply the filter after the war base was loaded via ajax
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // The main content is being added to the div
      if (mutation.addedNodes.length === 18) {
        init();
      }
    });
  });

  // start listening for changes
  var observerTarget = $MAIN[0];
  var observerConfig = { attributes: false, childList: true, characterData: false };
  observer.observe(observerTarget, observerConfig);
} catch (err) {
  console.log(err);
}

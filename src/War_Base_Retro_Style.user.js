// ==UserScript==
// @name        War Base Retro Style
// @namespace   vinkuun.warBaseRetroStyle
// @author      Vinkuun [1791283]
// @description Brings back the old war base layout
// @include     *.torn.com/factions.php?step=your
// @version     2.0.0
// @require     http://cdnjs.cloudflare.com/ajax/libs/jquery/2.1.1/jquery.min.js
// @grant       GM_addStyle
// ==/UserScript==

'use strict';

this.$ = this.jQuery = jQuery.noConflict(true);

// returns true if the layout is enabled, false if not
function isEnabled() {
  return JSON.parse(localStorage.vinkuunWarBaseRetroLayout || 'true');   
}

// add the css used to get the old style back
GM_addStyle(
  '.oldWarBase .f-war-list { margin-top: 10px }' +
  '.oldWarBase .f-war-list > li, .oldWarBase .f-war-list > li.first-in-row { margin: 10px 0; padding: 0; height: auto; width: auto }' +
  '.oldWarBase .f-war-list > li .status-wrap { display: none }' +
  '.oldWarBase .f-war-list > li .desc-wrap { display: block !important }' +
  '.oldWarBase .first-in-row { margin: 0; padding: 0 }'
);

var $main = $('#faction-main');

// enables the old layout after the page has loaded
if (isEnabled()) {
  $main.addClass('oldWarBase');   
}

// button used to toggle the old/new layout
var $toggleButton = $('<button></button>', {text: 'Toggle war base layout'}).on('click', function() {                
  if (isEnabled()) {
    localStorage.vinkuunWarBaseRetroLayout = false;
    $main.removeClass('oldWarBase');
  } else {
    localStorage.vinkuunWarBaseRetroLayout = true;
    $main.addClass('oldWarBase');
  }
});

// add the button after the tabs
$main.before($('<p></p>', {style: 'text-align: center; font-size: 12px;'}).append($toggleButton));

// show/hide the button according to the button
var urlChangeCallback = function () {
  if (window.location.hash === '#/tab=main' || window.location.hash === '') {
    $toggleButton.show();
  } else {
    $toggleButton.hide();
  }
};

// call it one time to show/hide the button after the page has loaded
urlChangeCallback();

// listen to a change
window.onhashchange = urlChangeCallback;

// ============================================================================
// --- FEATURE: War base filter
// ============================================================================
function featureWarBaseFilter() {
  // load saved war base filter settings
  var warBasefilter = JSON.parse(localStorage.vinkuunWarBaseFilter || '{}');

  // observer used to apply the filter after the war base was loaded via ajax
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      // The main content is being added to the div
      if (mutation.addedNodes.length === 18) {
        var $warList = $(mutation.addedNodes[5]);

        applyFilter($warList, warBasefilter);
      }
    });    
  });

  // start listening for changes
  var observerTarget = $('#faction-main')[0];
  var observerConfig = { attributes: false, childList: true, characterData: false };
  observer.observe(observerTarget, observerConfig);

  /**
   * Applys the filter to the war base
   * 
   * @param  {jquery-Object} $list
   * @param  {Object} filter
   * @return {undefined}
   */
  function applyFilter($list, filter) {
    var countFiltered = 0;
    var items;

    filter.status = filter.status || {};

    if (filter.status.okay) {
      items = $list.find('span:contains("Okay")');
      countFiltered += items.length;

      items.parent().parent().hide();
    }

    if (filter.status.traveling) {
      items = $list.find('span:contains("Traveling")');
      countFiltered += items.length;

      items.parent().parent().hide();
    }

    if (filter.status.hospital) {
      $list.find('span:contains("Hospital")').each(function() {
        var $this = $(this);

        var $li = $this.parent().parent();

        var hospitalTimeLeft = remainingHospitalTime($li.find('.member-icons #icon15').attr('title'));

        if (hospitalTimeLeft > filter.status.hospital.timeLeft) {
          countFiltered++;
          $li.hide();
        }
      });
    }

    // display the number of hidden members
    var $countFilteredElement = $list.find('li.countFiltered');
    if ($countFilteredElement.length === 0) {
      $countFilteredElement = $('<li>', {class: 'countFiltered'});
      $list.prepend($countFilteredElement);
    }

    $countFilteredElement.text(countFiltered + ' members are not shown because of the current filter.');
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
}

// ============================================================================
// --- INIT
// ============================================================================
try {
  featureWarBaseFilter();
} catch (err) {
  console.log(err);
}

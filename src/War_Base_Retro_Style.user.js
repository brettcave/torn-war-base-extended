// ==UserScript==
// @name        War Base Retro Style
// @namespace   vinkuun.warBaseRetroStyle
// @author      Vinkuun [1791283]
// @description Brings back the old war base layout
// @include     *.torn.com/factions.php?step=your
// @version     1.2.0
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

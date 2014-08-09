// ==UserScript==
// @name        War Base Retro Style
// @namespace   vinkuun.warBaseRetroStyle
// @author      Vinkuun [1791283]
// @description Brings back the old war base layout
// @include     *.torn.com/factions.php?step=your
// @version     1.0.0
// @grant       GM_addStyle
// ==/UserScript==

GM_addStyle(
  ".f-war-list { margin-top: 10px }" +
  ".f-war-list > li, .f-war-list > li.first-in-row { margin: 10px 0; padding: 0; height: auto; width: auto }" +
  ".f-war-list > li .status-wrap { display: none }" +
  ".f-war-list > li .desc-wrap { display: block !important }" +
  ".first-in-row { margin: 0; padding: 0 }" 
);

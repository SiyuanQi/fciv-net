/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2017  The Freeciv-web project

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

***********************************************************************/

var QUALITY_MEDIUM = 2; // medium quality.
var QUALITY_HIGH = 3;   // best quality, add features which require high-end graphics hardware here.

var graphics_quality = QUALITY_HIGH;

var terrain_quality = 6;

var anaglyph_3d_enabled = false;
var stats = null;

/****************************************************************************
  Init the Freeciv-web WebGL renderer
****************************************************************************/
function init_webgl_renderer()
{
  if (!Detector.webgl) {
    swal("3D WebGL not supported by your browser or you don't have a 3D graphics card. Please go back and try the 2D version instead. ");
    return;
  }

  console.log("Three.js " + THREE.REVISION);

  var stored_graphics_quality_setting = simpleStorage.get("graphics_quality", "");
  if (stored_graphics_quality_setting != null && stored_graphics_quality_setting > 0) {
    graphics_quality = stored_graphics_quality_setting;
  } else {
    graphics_quality = QUALITY_HIGH; //default value
  }

}


/****************************************************************************
  Preload is complete.
****************************************************************************/
function webgl_preload_complete()
{
  $.unblockUI();

  network_init();

}


function renderer_init() {
  if (C_S_RUNNING == client_state() || C_S_OVER == client_state()) {
    webgl_start_renderer();
    init_webgl_mapview();
    init_webgl_mapctrl();
    mapdeco_init();
    $.unblockUI();
    setTimeout("$('#mapcanvas').fadeIn(2500);", 300);
  }
}
/**********************************************************************
    Freeciv-web - the web version of Freeciv. http://play.freeciv.org/
    Copyright (C) 2009-2015  The Freeciv-web project

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


var C_S_INITIAL = 0;    /* Client boot, only used once on program start. */
var C_S_PREPARING = 1;  /* Main menu (disconnected) and connected in pregame. */
var C_S_RUNNING = 2;    /* Connected with game in progress. */
var C_S_OVER = 3;       /* Connected with game over. */

var civclient_state = C_S_INITIAL;

var endgame_player_info = [];
var height_offset = 52;
var width_offset = 10;

/**************************************************************************
 Sets the client state (initial, pre, running, over etc).
**************************************************************************/
function set_client_state(newstate)
{
  if (civclient_state != newstate) {
    civclient_state = newstate;

    switch (civclient_state) {
    case C_S_RUNNING:
      clear_chatbox();
      $.unblockUI();
      show_new_game_message();

      set_client_page(PAGE_GAME);
      setup_window_size();

      update_metamessage_on_gamestart();

      if (is_pbem()) {
        setTimeout(function () {
          set_human_pbem_players();
          advance_unit_focus();
        }, 1500);
      }

      /* remove context menu from pregame. */
      $(".context-menu-root").remove();

      if (renderer == RENDERER_WEBGL) {
        init_webgl_mapview();
      }

      if (observing || $.getUrlVar('action') == "multi" || is_longturn() || game_loaded) {
        center_on_any_city();
        advance_unit_focus();
      }
      $("#fciv-intro").hide();

      break;
    case C_S_OVER:
      setTimeout(show_endgame_dialog, 500);
      break;
    case C_S_PREPARING:
      break;
    default:
      break;
    }
  }
}

/**************************************************************************
  Refreshes the size of UI elements based on new window and screen size.
**************************************************************************/
function setup_window_size ()
{
  var winWidth = $(window).width();
  var winHeight = $(window).height();
  var new_mapview_width = winWidth - width_offset;
  var new_mapview_height = winHeight - height_offset;


  $("#pregame_message_area").height( new_mapview_height - 100
                                        - $("#pregame_game_info").outerHeight());
  $("#pregame_player_list").height( new_mapview_height - 100);

  $("#nations").height( new_mapview_height - 100);
  $("#nations").width( new_mapview_width);

  $('#tabs').css("height", $(window).height());
  $("#tabs-map").height(new_mapview_height);


  $("#city_viewport").height( new_mapview_height - 20);

  $("#opt_tab").show();
  $("#players_tab").show();
  $("#cities_tab").show();
  $("#freeciv_logo").show();
  $("#tabs-hel").hide();

  if (is_small_screen()) {
    $("#map_tab").children().html("<i class='fa fa-globe' aria-hidden='true'></i>");
    $("#opt_tab").children().html("<i class='fa fa-cogs' aria-hidden='true'></i>");
    $("#players_tab").children().html("<i class='fa fa-flag' aria-hidden='true'></i>");
    $("#cities_tab").children().html("<i class='fa fa-fort-awesome' aria-hidden='true'></i>");
    $("#tech_tab").children().html("<i class='fa fa-flask' aria-hidden='true'></i>");
    $("#civ_tab").children().html("<i class='fa fa-university' aria-hidden='true'></i>");
    $("#hel_tab").children().html("<i class='fa fa-question-circle-o' aria-hidden='true'></i>");


    $(".ui-tabs-anchor").css("padding", "3px");

    $("#freeciv_logo").hide();
    overview_active = false;

    if ($("#game_unit_orders_default").length > 0) $("#game_unit_orders_default").remove();
    if ($("#game_unit_orders_settlers").length > 0) $("#game_unit_orders_settlers").remove();
    $("#game_status_panel_bottom").css("font-size", "0.8em");

    game_unit_panel_state = "minimized";

  }

  $("#tabs-map").css("overflow", "hidden");

  if (overview_active) init_overview();
  if (unitpanel_active) init_game_unit_panel();
}

function client_state()
{
  return civclient_state;
}


/**************************************************************************
  Return TRUE if the client can change the view; i.e. if the mapview is
  active.  This function should be called each time before allowing the
  user to do mapview actions.
**************************************************************************/
function can_client_change_view()
{
  return ((client.conn.playing != null || client_is_observer())
      && (C_S_RUNNING == client_state()
	      || C_S_OVER == client_state()));
}

/**************************************************************************
  Returns TRUE if the client can control the player.
**************************************************************************/
function can_client_control()
{
  return (null != client.conn.playing && !client_is_observer());
}

/**************************************************************************
  Returns TRUE if the client can issue orders (giving unit commands, etc).
**************************************************************************/
function can_client_issue_orders()
{
  return (can_client_control() && C_S_RUNNING == client_state());
}

/**************************************************************************
  Webclient does have observer support.
**************************************************************************/
function client_is_observer()
{
  return client.conn['observer'] || observing;
}

/**************************************************************************
  Intro message
**************************************************************************/
function show_new_game_message()
{
  var message = null;

  clear_chatbox();

  if (observing || $.getUrlVar('autostart') == "true") {
    return;

  } else if (is_hotseat()) {
    show_hotseat_new_phase();
    return;
  } else if (is_pbem()) {
    message = "Welcome " + username + "! It is now your turn to play. Each player will " +
      "get an e-mail when it is their turn to play, and can only play one turn at a time. " +
      "Click the end turn button to end your turn and let the next opponent play.";
    setTimeout(check_queued_tech_gained_dialog, 2500);

  } else if (client.conn.playing != null && !game_loaded) {
    var pplayer = client.conn.playing;
    message = "Welcome, " + username + " ruler of the " + nations[pplayer['nation']]['adjective'] + " empire.";

  } else if (game_loaded) {
    message = "Welcome back, " + username;
    if (client.conn.playing != null) {
     message += " ruler of the " + nations[client.conn.playing['nation']]['adjective'] + " empire.";
    }
  } else {
    return;
  }

  message_log.update({ event: E_CONNECTION, message: message });
}

/**************************************************************************
...
**************************************************************************/
function alert_war(player_no)
{
  var pplayer = players[player_no];
  message_log.update({
    event: E_DIPLOMACY,
    message: "War: You are now at war with the "
	+ nations[pplayer['nation']]['adjective']
        + " leader " + pplayer['name'] + "!"
  });
}

/**************************************************************************
 Shows the endgame dialog
**************************************************************************/
function show_endgame_dialog()
{
  var title = "Final Report: The Greatest Civilizations in the world!";
  var message = "<p id='hof_msg'></p>";
  for (var i = 0; i < endgame_player_info.length; i++) {
    var pplayer = players[endgame_player_info[i]['player_id']];
    var nation_adj = nations[pplayer['nation']]['adjective'];
    message += (i+1) + ": The " + nation_adj + " ruler " + pplayer['name'] 
      + " scored " + endgame_player_info[i]['score'] + " points" + "<br>";
  }

  // reset dialog page.
  $("#dialog").remove();
  $("<div id='dialog'></div>").appendTo("div#game_page");

  $("#dialog").html(message);
  $("#dialog").attr("title", title);
  $("#dialog").dialog({
			bgiframe: true,
			modal: true,
			width: is_small_screen() ? "90%" : "50%",
			buttons: {
                "Game replay" : function() {
                  show_replay();
                },
				"Show Scores" : function() {
					$("#dialog").dialog('close');
					view_game_scores();
				},
				Ok: function() {
					$("#dialog").dialog('close');
					$("#game_text_input").blur();
				}
			}
		});

  $("#dialog").dialog('open');
  $("#game_text_input").blur();
  $("#dialog").css("max-height", "500px");

  setTimeout(submit_game_to_hall_of_fame, 1000);
}


/**************************************************************************
 Updates message on the metaserver on gamestart.
**************************************************************************/
function update_metamessage_on_gamestart()
{
  if (!observing && !metamessage_changed && client.conn.playing != null
      && client.conn.playing['pid'] == players[0]['pid'] 
      && $.getUrlVar('action') == "new") {
    var pplayer = client.conn.playing;
    var metasuggest = username + " ruler of the " + nations[pplayer['nation']]['adjective'] + ".";
    send_message("/metamessage " + metasuggest);
    setInterval(update_metamessage_game_running_status, 200000);
  }

  if ($.getUrlVar('action') == null || $.getUrlVar('action') == "new" || $.getUrlVar('action') == "earthload" 
      || $.getUrlVar('scenario') == "true") {
      $.post("/freeciv_time_played_stats?type=single3d").fail(function() {});
  }
  if ($.getUrlVar('action') == "multi" && client.conn.playing != null
      && client.conn.playing['pid'] == players[0]['pid'] && !is_longturn()) {
    $.post("/freeciv_time_played_stats?type=multi").fail(function() {});
  }
  if ($.getUrlVar('action') == "hotseat") {
    $.post("/freeciv_time_played_stats?type=hotseat").fail(function() {});
    send_message("/metamessage hotseat game" );
  }
}

/**************************************************************************
 Updates message on the metaserver during a game.
**************************************************************************/
function update_metamessage_game_running_status()
{
  if (client.conn.playing != null && !metamessage_changed) {
    var pplayer = client.conn.playing;
    var metasuggest = nations[pplayer['nation']]['adjective'] + " | " + (governments[client.conn.playing['government']] != null ? governments[client.conn.playing['government']]['name'] : "-")
         + " | People:" + civ_population(client.conn.playing.playerno)
         + " | Score:" + pplayer['score'] + " | " + "Research:" + (techs[client.conn.playing['researching']] != null ? techs[client.conn.playing['researching']]['name'] : "-" );
    send_message("/metamessage " + metasuggest);

  }
}


/**************************************************************************
  ...
**************************************************************************/
function set_default_mapview_active()
{

  var active_tab = $('#tabs').tabs('option', 'active');
  if (active_tab == 4) { // cities dialog is active
    return;
  }

  if (unitpanel_active) {
    update_active_units_dialog();
  }

  if (chatbox_active) {
    $("#game_chatbox_panel").parent().show();
    if (current_message_dialog_state == "minimized") $("#game_chatbox_panel").dialogExtend("minimize");
  }

  $("#tabs").tabs("option", "active", 0);
  $("#tabs-map").height("auto");

  tech_dialog_active = false;
  allow_right_click = false;
  keyboard_input = true;

  $("#game_overview_panel").parent().show();

  $("#freeciv_custom_scrollbar_div").mCustomScrollbar("scrollTo", "bottom",{scrollInertia:0});


}


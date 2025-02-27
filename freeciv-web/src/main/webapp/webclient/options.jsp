  
<div>

<div style="text-align: center;">
<center>

<h2>Game Options</h2>

<div class="main_menu_buttons">

<table>


<tr>
<td>
<div class="main_menu_buttons">
  <button id="save_button" type="button" class="button setting_button" onClick="save_game();" title="Saves your current game so you can continue later. Press Ctrl+S to quick save the game.">Save Game (Ctrl+S)</button>
</div>
</td>
<td>
<div class="main_menu_buttons">
  <button id="fullscreen_button" type="button" class="button setting_button" onClick="show_fullscreen_window();" title="Enables fullscreen window mode" >Fullscreen</button>
</div>
</td>
</tr>
<tr>
<td>
<div class="main_menu_buttons">
  <button id="surrender_button" type="button" class="button setting_button" onClick="surrender_game();" title="Surrenders in multiplayer games and thus ends the game for you.">Surrender Game</button>
</div>
</td>
<td>
<div class="main_menu_buttons">
  <button id="end_button" type="button" class="button setting_button" onClick="window.location='/';" title="Ends the game, and returns to the main page of Freeciv-web." >End Game</button>
</div>
</td>
</tr>

<tr>
<td>
  <div class="main_menu_buttons">
    <b>ChatGTP OpenAI enabled:</b> <input type='checkbox' name='openai_setting' id='openai_setting' checked>
  </div>
</td>
</tr>

<tr>
<td>
  <div class="main_menu_buttons">
    <b>Play sounds:</b> <input type='checkbox' name='play_sounds_setting' id='play_sounds_setting' checked>
  </div>
</td>
<td>
  <div class="main_menu_buttons">
    <b>Speech messages:</b> <input type='checkbox' name='speech_enabled_setting' id='speech_enabled_setting'>
  </div>
</td>
</tr>
<tr>
<td>
  <div class="main_menu_buttons">
    <b>Dialogs open minimized:</b> <input type='checkbox' name='dialogs_minimized_setting' id='dialogs_minimized_setting'>
  </div>
</td>
<td>
<div class="main_menu_buttons">
  <button id="city_labels_hide_button" type="button" class="button setting_button" onClick="hide_city_labels();" title="Hide city labels." >Hide city labels</button>
</div>
</td>
</tr>
</table>



<div class="main_menu_buttons" id="timeout_setting_div">
  <b>Timeout (seconds per turn):</b> <input type='number' name='timeout_setting' id='timeout_setting' size='6' length='3' max='3600' step='1'>
  <span id="timeout_info"></span>
</div>

<div class="main_menu_buttons" id="title_setting_div">
  <b>Game title:</b> <input type='text' name='metamessage_setting' id='metamessage_setting' size='28' maxlength='42'>
</div>

<div class="main_menu_buttons">
<table>
<tr>
  <td>
    <button id="fps_button" type="button" class="button setting_button" onClick="show_fps();">Show fps</button>
  </td>
  <td>
    <button id="hof_button" type="button" class="button setting_button" onClick="submit_game_of_the_day();">Submit Game of the Day</button>
  </td>
</tr>
</table>

</div>


</center>
</div>

</div>


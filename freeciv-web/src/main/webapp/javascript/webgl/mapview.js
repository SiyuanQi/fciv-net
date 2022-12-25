/**********************************************************************
    Fciv.net - the web version of Freeciv. http://www.fciv.net/
    Copyright (C) 2009-2022  The Freeciv-web project

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

var container, stats;
var scene, maprenderer;
var anaglyph_effect;

var mouse, raycaster;
var directionalLight;
var clock;

var controls;

var tiletype_terrains = ["coast","ocean","arctic","desert","grassland","hills","mountains","plains","swamp","tundra", "farmland", "irrigation"];

var landGeometry;
var landMesh; // the terrain land geometry
var water;

var lofiGeometry;
var lofiMesh;  // low resolution mesh used for raycasting.

var mapview_model_width;
var mapview_model_height;
var xquality;
var yquality;

var width_half;
var height_half;
var gridX;
var gridY;
var gridX1;
var gridY1;
var segment_width;
var segment_height;
var MAPVIEW_ASPECT_FACTOR = 35.71;


/****************************************************************************
  Start the Freeciv-web WebGL renderer
****************************************************************************/
function webgl_start_renderer()
{
  var new_mapview_width = $(window).width() - width_offset;
  var new_mapview_height;
  if (!is_small_screen()) {
    new_mapview_height = $(window).height() - height_offset;
  } else {
    new_mapview_height = $(window).height() - height_offset - 40;
  }

  if (!Detector.webgl) {
    swal("3D WebGL not supported by your browser or you don't have a 3D graphics card. Please go back and try the 2D version instead. ");
    return;
  }

  container = document.getElementById('mapcanvas');
  camera = new THREE.PerspectiveCamera( 45, new_mapview_width / new_mapview_height, 1, 5000 );
  scene = new THREE.Scene();

  raycaster = new THREE.Raycaster();
  raycaster.layers.set(6);

  mouse = new THREE.Vector2();

  clock = new THREE.Clock();

  // Lights
  var ambientLight = new THREE.AmbientLight( 0x606060, 3.3 );
  scene.add(ambientLight);

  directionalLight = new THREE.DirectionalLight( 0xffffff, 3.8 );
  directionalLight.position.set( 0.5, 0.75, 1.0 ).normalize();
  scene.add( directionalLight );

  var enable_antialiasing = graphics_quality >= QUALITY_MEDIUM;
  var stored_antialiasing_setting = simpleStorage.get("antialiasing_setting", "");
  if (stored_antialiasing_setting != null && stored_antialiasing_setting == "false") {
    enable_antialiasing = false;
  }

  maprenderer = new THREE.WebGLRenderer( { antialias: enable_antialiasing} );

  maprenderer.setPixelRatio(window.devicePixelRatio);
  maprenderer.setSize(new_mapview_width, new_mapview_height);
  container.appendChild(maprenderer.domElement);

  controls = new THREE.OrbitControls( camera, maprenderer.domElement );
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = 0.9 * Math.PI / 2;

  if (anaglyph_3d_enabled) {
    anaglyph_effect = new THREE.AnaglyphEffect( maprenderer );
    anaglyph_effect.setSize( new_mapview_width, new_mapview_height );
  }

  const sky = new THREE.WebGLCubeRenderTarget(webgl_textures["skybox"].image.height);
  sky.fromEquirectangularTexture(maprenderer, webgl_textures["skybox"]);
  if (do_render_skybox()) {
    scene.background = sky.texture;
  }
  scene.originalbackground = sky.texture;

  animate();

  $("#pregame_page").hide();
}


/****************************************************************************
 This will render the map terrain mesh.
****************************************************************************/
function init_webgl_mapview() {

  selected_unit_material = new THREE.MeshBasicMaterial( { color: 0xf6f7bf, transparent: true, opacity: 0.5} );

  var textureLoader = new THREE.TextureLoader();
  var waterGeometry = new THREE.PlaneGeometry( mapview_model_width + 50, mapview_model_height + 50 );

  water = new THREE.Water(waterGeometry, {
      color: '#55c0ff',
      scale: 10,
      flowDirection: new THREE.Vector2( 0.1, -0.1),
      textureWidth: 1024,
      textureHeight: 1024,
      reflectivity : 0.7,
      clipBias : 0.05,
      normalMap0 : textureLoader.load( '/textures/Water_1_M_Normal.jpg' ),
      normalMap1 : textureLoader.load( '/textures/Water_2_M_Normal.jpg' )

    } );

    water.rotation.x = - Math.PI * 0.5;
    water.translateOnAxis(new THREE.Vector3(0,0,1).normalize(), 50);
    water.translateOnAxis(new THREE.Vector3(1,0,0).normalize(), Math.floor(mapview_model_width / 2) - 500);
    water.translateOnAxis(new THREE.Vector3(0,1,0).normalize(), -mapview_model_height / 2);
    water.renderOrder = -1; // Render water first, this will sove transparency issues in city labels.
    scene.add( water );

  /* heightmap image */
  init_borders_image();
  init_roads_image();
  init_map_tiletype_image();

  var vertex_shader = $('#terrain_vertex_shh').html();
  var fragment_shader = $('#terrain_fragment_shh').html();

  if (maprenderer.capabilities.maxTextures <= 16) {
    delete tiletype_terrains["irrigation"];
    console.log("max textures: " + maprenderer.capabilities.maxTextures);
    fragment_shader = fragment_shader.replace("uniform sampler2D irrigation;", "")
                                     .replaceAll("irrigation", "farmland");
  }

  /* uniforms are variables which are used in the fragment shader fragment.js */
  var freeciv_uniforms = {
    maptiles: { type: "t", value: maptiletypes },
    borders: { type: "t", value: update_borders_image() },
    map_x_size: { type: "f", value: map['xsize'] },
    map_y_size: { type: "f", value: map['ysize'] },
    is_low_res : maprenderer.capabilities.maxTextures <= 16,
    roadsmap: { type: "t", value: update_roads_image()},
    roadsprites: {type: "t", value: webgl_textures["roads"]},
    railroadsprites: {type: "t", value: webgl_textures["railroads"]}
  };

  for (var i = 0; i < tiletype_terrains.length ; i++) {
    var terrain_name = tiletype_terrains[i];
    freeciv_uniforms[terrain_name] = {type: "t", value: webgl_textures[terrain_name]};
  }

  // Low-resolution terrain mesh used for raycasting to find mouse postition.
  create_heightmap(2);
  var lofiMaterial = new THREE.MeshStandardMaterial({"color" : 0x00ff00});
  lofiGeometry = new THREE.BufferGeometry();
  create_land_geometry(lofiGeometry, 2);
  lofiMesh = new THREE.Mesh( lofiGeometry, lofiMaterial );
  lofiMesh.layers.set(6);
  scene.add(lofiMesh);

  // High-resolution terrain-mesh shown in mapview.
  create_heightmap(terrain_quality);
  var terrain_material = new THREE.ShaderMaterial({
    uniforms: freeciv_uniforms,
    vertexShader: vertex_shader,
    fragmentShader: fragment_shader,
    vertexColors: true
  });
  landGeometry = new THREE.BufferGeometry();
  create_land_geometry(landGeometry, terrain_quality);
  landMesh = new THREE.Mesh( landGeometry, terrain_material );
  scene.add(landMesh);

  update_map_terrain_geometry();
  setInterval(update_map_terrain_geometry, 90);

  add_all_objects_to_scene();

  benchmark_start = new Date().getTime();

}

/****************************************************************************
  Create the land terrain geometry
  (note that this changes global variables).
****************************************************************************/
function create_land_geometry(geometry, mesh_quality)
{
  xquality = map.xsize * mesh_quality + 1;
  yquality = map.ysize * mesh_quality + 1;

  width_half = mapview_model_width / 2;
  height_half = mapview_model_height / 2;

  gridX = Math.floor(xquality);
  gridY = Math.floor(yquality);

  gridX1 = gridX + 1;
  gridY1 = gridY + 1;

  segment_width = mapview_model_width / gridX;
  segment_height = mapview_model_height / gridY;

  const indices = [];
  const vertices = [];
  const normals = [];
  const uvs = [];
  const colors = [];

  for ( let iy = 0; iy < gridY1; iy ++ ) {
    const y = iy * segment_height - height_half;
    for ( let ix = 0; ix < gridX1; ix ++ ) {
      const x = ix * segment_width - width_half;
      var sx = ix % xquality, sy = iy % yquality;

      vertices.push( x, -y, heightmap[sx][sy] * 100 );
      normals.push( 0, 0, 1 );
      uvs.push( ix / gridX );
      uvs.push( 1 - ( iy / gridY ) );

    }

  }

  for ( let iy = 0; iy < gridY; iy ++ ) {
    for ( let ix = 0; ix < gridX; ix ++ ) {
      const a = ix + gridX1 * iy;
      const b = ix + gridX1 * ( iy + 1 );
      const c = ( ix + 1 ) + gridX1 * ( iy + 1 );
      const d = ( ix + 1 ) + gridX1 * iy;

      indices.push( a, b, d );
      indices.push( b, c, d );
    }
  }

  geometry.setIndex( indices );
  geometry.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  geometry.setAttribute( 'normal', new THREE.Float32BufferAttribute( normals, 3 ) );
  geometry.setAttribute( 'uv', new THREE.Float32BufferAttribute( uvs, 2 ) );

  for ( let iy = 0; iy < gridY1; iy ++ ) {
    for ( let ix = 0; ix < gridX1; ix ++ ) {
      const x = ix * segment_width - width_half;
      var sx = ix % xquality, sy = iy % yquality;
      var mx = Math.floor(sx / 4), my = Math.floor(sy / 4);
      var ptile = map_pos_to_tile(mx, my);
        if (ptile == null) {
          colors.push(0,0,0);
        } else if (tile_get_known(ptile) == TILE_KNOWN_SEEN) {
          colors.push(1,0,0);
        } else if (tile_get_known(ptile) == TILE_KNOWN_UNSEEN) {
          colors.push(0.40,0,0);
        } else if (tile_get_known(ptile) == TILE_UNKNOWN) {
          colors.push(0,0,0);
        } else {
          colors.push(0,0,0);
        }
    }
  }

  geometry.setAttribute( 'vertColor', new THREE.Float32BufferAttribute( colors, 3) );

  geometry.computeVertexNormals();

  return geometry;
}

/****************************************************************************
  Update the map terrain geometry!
****************************************************************************/
function update_map_terrain_geometry()
{
  if (!vertex_colors_dirty) {
    return;
  }

  create_heightmap(2);
  create_land_geometry(lofiGeometry, 2);
  create_heightmap(terrain_quality);
  create_land_geometry(landGeometry, terrain_quality);

  lofiGeometry.rotateX( - Math.PI / 2 );
  lofiGeometry.translate(Math.floor(mapview_model_width / 2) - 500, 0, Math.floor(mapview_model_height / 2));
  landGeometry.rotateX( - Math.PI / 2 );
  landGeometry.translate(Math.floor(mapview_model_width / 2) - 500, 0, Math.floor(mapview_model_height / 2));

  update_tiles_known_vertex_colors();
  update_tiletypes_image();
  vertex_colors_dirty = false;

}

/****************************************************************************
  Main animation method
****************************************************************************/
function animate() {
  if (scene == null) return;
  if (stats != null) stats.begin();
  if (mapview_slide['active']) update_map_slide_3d();

  update_animated_objects();


  if (selected_unit_indicator != null && selected_unit_material != null) {
    selected_unit_material.color.multiplyScalar (0.994);
    if (selected_unit_material_counter > 80) {
      selected_unit_material_counter = 0;
      selected_unit_material.color.setHex(0xf6f7bf);
    }
    selected_unit_material_counter++;
  }

  controls.update();

  if (anaglyph_3d_enabled) {
    anaglyph_effect.render(scene,camera);
  } else {
    maprenderer.render(scene, camera);
  }

  if (goto_active) check_request_goto_path();
  if (stats != null) stats.end();
  if (initial_benchmark_enabled || benchmark_enabled) benchmark_frames_count++;


  requestAnimationFrame(animate);
}

/****************************************************************************
  Is the camera looking down, then don't render the skybox since it's not visible.
****************************************************************************/
function do_render_skybox() {
  var vector = new THREE.Vector3();
  camera.getWorldDirection(vector);
  return -0.44 < Math.sin(vector.y);

}
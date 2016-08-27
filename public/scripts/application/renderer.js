// Renderer

void function(){

  'use strict';

  // Check application availability

  if (typeof application == "undefined") {
    console.log("renderer.js : No 'application' module found! Be sure to load it up first!");
    return;
  };

  // Private members

  var _canvas = null;
  var _context = null;
  var _extensions = null;
  var _width = null;
  var _height = null;

  var _texture = null;
  var _shaders = [
    {
      vertexSource : `
      precision highp float;

      attribute vec3 a_vertex_position;
      varying vec2 v_uv;
      const vec2 scale = vec2(0.5, 0.5);

      void main(void) {
        gl_Position = vec4(a_vertex_position, 1.0);
        v_uv = a_vertex_position.xy * scale + scale;
      }
      `,
      fragmentSource : `
      precision highp float;

      varying vec2 v_uv;
      uniform sampler2D u_sampler;
      uniform vec2 u_resolution;
      void main(void) {
        gl_FragColor = texture2D(u_sampler, vec2(v_uv.s, v_uv.t));
      }
      `,
      attributes: {
        a_vertex_position : {}
      },
      uniforms: {
        u_resolution: {},
        u_sampler : {}
      }
    }
  ];

  var _full_screen_quad_buffer = {size: 3, count: 6, data: new Float32Array([-1.0, -1.0,  0.0, 1.0,  1.0,  0.0, -1.0,  1.0,  0.0, -1.0, -1.0,  0.0, 1.0, -1.0,  0.0, 1.0,  1.0,  0.0, ])};

  // Private methods

  var _initialize = function(width, height){
    _init_viewport(width*4, height*4);
    _init_shaders();
    _init_full_screen_quad_buffer();
    _init_texture();
    _loading_complete();
  };

  var _init_texture = function(){
    var texture = _context.createTexture();
    var image = new Image();
    image.onload = function() {
      _context.bindTexture(_context.TEXTURE_2D, texture);
      _context.texImage2D(_context.TEXTURE_2D, 0, _context.RGBA, _context.RGBA, _context.UNSIGNED_BYTE, image);
      _context.texParameteri(_context.TEXTURE_2D, _context.TEXTURE_MAG_FILTER, _context.NEAREST);
      _context.texParameteri(_context.TEXTURE_2D, _context.TEXTURE_MIN_FILTER, _context.NEAREST);
      _context.texParameteri(_context.TEXTURE_2D, _context.TEXTURE_WRAP_S, _context.CLAMP_TO_EDGE);
      _context.texParameteri(_context.TEXTURE_2D, _context.TEXTURE_WRAP_T, _context.CLAMP_TO_EDGE);
      _context.generateMipmap(_context.TEXTURE_2D);
      _context.bindTexture(_context.TEXTURE_2D, null);
      _texture = texture;
    }
    image.src = application.data;
  }

  var _init_viewport = function(width, height){

    // Initialize context

    var _canvas = document.createElement('canvas');
    _canvas.width = _width = width;
    _canvas.height = _height = height;
    document.body.appendChild(_canvas);
    _context = _canvas.getContext("experimental-webgl");
    _context.clearColor(0.0, 0.0, 0.0, 0.0);
    _context.disable(_context.DEPTH_TEST);
    _context.depthMask(false);
    _context.enable(_context.BLEND);
    _context.blendFunc(_context.SRC_ALPHA, _context.ONE);
    _context.viewport(0, 0, _width, _height);

    // Initialize extensions

    _extensions = {
      float_textures : _context.getExtension('OES_texture_float')
    }

    _clear();
    _loading();
  }

  var _loading = function(){
    renderer.tick = _tick_loading;
  }

  var _loading_complete = function(){
    renderer.tick = _tick_ready;
  }

  var _tick_loading = function(){
    _clear();
  };

  var _tick_ready = function(){
    _clear();
    _draw_full_screen_quad();
  };

  var _clear = function(){
    _context.clearColor(0.0, 0.0, 0.0, 0.0);
    _context.clearDepth(1.0);
    _context.clear(_context.COLOR_BUFFER_BIT | _context.DEPTH_BUFFER_BIT);
  };

  // Initialize shaders

  var _init_shaders = function(){
    for (var i = 0; i < _shaders.length; ++i) {

      // Vertex and fragment shader

      var vertexShader = _context.createShader(_context.VERTEX_SHADER);
      _context.shaderSource(vertexShader, _shaders[i].vertexSource);
      _context.compileShader(vertexShader);
      var fragmentShader = _context.createShader(_context.FRAGMENT_SHADER);
      _context.shaderSource(fragmentShader, _shaders[i].fragmentSource);
      _context.compileShader(fragmentShader);

      // Shader program

      _shaders[i].program = _context.createProgram();
      _context.attachShader(_shaders[i].program, vertexShader);
      _context.attachShader(_shaders[i].program, fragmentShader);
      _context.linkProgram(_shaders[i].program);
      _context.detachShader(_shaders[i].program, vertexShader);
      _context.detachShader(_shaders[i].program, fragmentShader);
      _context.deleteShader(vertexShader);
      _context.deleteShader(fragmentShader);

      // Bind attributes and uniforms

      for (var attribute in _shaders[i].attributes) {
        _shaders[i].attributes[attribute].location = _context.getAttribLocation(_shaders[i].program, attribute);
        _context.enableVertexAttribArray(_shaders[i].attributes[attribute].location);
      }
      for (var uniform in _shaders[i].uniforms) {
        _shaders[i].uniforms[uniform].location = _context.getUniformLocation(_shaders[i].program, uniform);
      }
    }
  }

  // Initialize buffers

  var _init_full_screen_quad_buffer = function(){
    _full_screen_quad_buffer.buffer = _context.createBuffer();
    _context.bindBuffer(_context.ARRAY_BUFFER, _full_screen_quad_buffer.buffer);
    _context.bufferData(_context.ARRAY_BUFFER, _full_screen_quad_buffer.data, _context.STATIC_DRAW);
    _context.bindBuffer(_context.ARRAY_BUFFER, null);
  }

  // Render

  var _draw_full_screen_quad = function(){
    _context.bindFramebuffer(_context.FRAMEBUFFER, null);
    _context.viewport(0, 0, _width, _height);
    _context.clear(_context.COLOR_BUFFER_BIT);
    _context.useProgram(_shaders[0].program);
    _context.enableVertexAttribArray(_shaders[0].attributes.a_vertex_position.location);
    _context.bindBuffer(_context.ARRAY_BUFFER, _full_screen_quad_buffer.buffer);
    _context.vertexAttribPointer( _shaders[0].attributes.a_vertex_position.location, _full_screen_quad_buffer.size, _context.FLOAT, false, 0, 0);
    _context.activeTexture(_context.TEXTURE0);
    _context.bindTexture(_context.TEXTURE_2D, _texture);
    _context.uniform1i(_shaders[0].uniforms.u_sampler.location, 0);
    _context.drawArrays(_context.TRIANGLES, 0, _full_screen_quad_buffer.count);
    _context.disableVertexAttribArray(_shaders[0].attributes.a_vertex_position.location);
  }

  // Public

  var renderer = {

    // Public methods

    initialize : _initialize,
    tick : _tick_loading,
    clear : _clear
  };

  application.renderer = renderer;
}();

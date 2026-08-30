import { Adjustments } from '../types';
import { VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE } from './shaders';

export class WebGLFilterEngine {
  private canvas: HTMLCanvasElement;
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private texture: WebGLTexture | null = null;
  private positionBuffer: WebGLBuffer | null = null;
  private texCoordBuffer: WebGLBuffer | null = null;

  private uniformLocations: { [key: string]: WebGLUniformLocation | null } = {};
  private attribLocations: { [key: string]: number } = {};

  private sourceElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement | null = null;
  private isTextureLoaded = false;
  private animationFrameId: number | null = null;
  private startTime = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.initGL();
  }

  private initGL() {
    this.gl = this.canvas.getContext('webgl', {
      preserveDrawingBuffer: true,
      premultipliedAlpha: false,
      antialias: true,
    }) || (this.canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);

    if (!this.gl) {
      console.error('WebGL is not supported in this browser.');
      return;
    }

    const gl = this.gl;

    // Create shader program
    const vertexShader = this.createShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
    const fragmentShader = this.createShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

    if (!vertexShader || !fragmentShader) return;

    this.program = gl.createProgram();
    if (!this.program) return;

    gl.attachShader(this.program, vertexShader);
    gl.attachShader(this.program, fragmentShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    gl.useProgram(this.program);

    // Get Attribute locations
    this.attribLocations.position = gl.getAttribLocation(this.program, 'a_position');
    this.attribLocations.texCoord = gl.getAttribLocation(this.program, 'a_texCoord');

    // Quad geometry (-1 to 1)
    const positions = new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]);

    this.positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    // Texture coords (0 to 1 with Y flipped for WebGL)
    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]);

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Setup uniform locations
    const uniformNames = [
      'u_image', 'u_resolution', 'u_time',
      'u_compare_active', 'u_split_pos',
      'u_exposure', 'u_contrast', 'u_highlights', 'u_shadows',
      'u_whites', 'u_blacks', 'u_temperature', 'u_tint',
      'u_saturation', 'u_vibrance', 'u_clarity',
      'u_hsl_red', 'u_hsl_orange', 'u_hsl_yellow', 'u_hsl_green',
      'u_hsl_cyan', 'u_hsl_blue', 'u_hsl_purple', 'u_hsl_magenta',
      'u_preset_strength',
      'u_grain_amount', 'u_grain_size', 'u_grain_roughness',
      'u_dust_type', 'u_dust_amount',
      'u_leak_type', 'u_leak_amount', 'u_leak_warmth',
      'u_glow_amount', 'u_glow_radius',
      'u_prism_amount', 'u_vignette_amount', 'u_vignette_roundness',
      'u_blur_mode', 'u_blur_amount', 'u_blur_center',
      'u_vhs_amount', 'u_flip'
    ];

    for (const name of uniformNames) {
      this.uniformLocations[name] = gl.getUniformLocation(this.program, name);
    }

    // Create texture
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  }

  private createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  public setSource(element: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement) {
    this.sourceElement = element;
    this.isTextureLoaded = false;
    this.uploadTexture();
  }

  public uploadTexture() {
    if (!this.gl || !this.texture || !this.sourceElement) return;
    const gl = this.gl;

    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

    try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.sourceElement);
      this.isTextureLoaded = true;
    } catch (err) {
      console.warn('Texture upload wait or cors issue:', err);
    }
  }

  public render(
    adjustments: Adjustments,
    compareMode: 'none' | 'split' | 'hold' = 'none',
    splitPos = 0.5,
    customTime?: number
  ) {
    if (!this.gl || !this.program) return;
    const gl = this.gl;

    // Check if source is video/camera and need to update texture per frame
    if (this.sourceElement instanceof HTMLVideoElement && this.sourceElement.readyState >= 2) {
      this.uploadTexture();
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0.07, 0.07, 0.07, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.isTextureLoaded) {
      if (this.sourceElement) this.uploadTexture();
      if (!this.isTextureLoaded) return;
    }

    gl.useProgram(this.program);

    // Setup Attributes
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.enableVertexAttribArray(this.attribLocations.position);
    gl.vertexAttribPointer(this.attribLocations.position, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.enableVertexAttribArray(this.attribLocations.texCoord);
    gl.vertexAttribPointer(this.attribLocations.texCoord, 2, gl.FLOAT, false, 0, 0);

    // Bind texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.uniform1i(this.uniformLocations.u_image, 0);

    // Resolution & Time
    gl.uniform2f(this.uniformLocations.u_resolution, gl.canvas.width, gl.canvas.height);
    const time = customTime !== undefined ? customTime : (performance.now() - this.startTime) / 1000;
    gl.uniform1f(this.uniformLocations.u_time, time);

    // Compare Mode
    let compareActive = 0.0;
    if (compareMode === 'split') compareActive = 1.0;
    else if (compareMode === 'hold') compareActive = 2.0;

    gl.uniform1f(this.uniformLocations.u_compare_active, compareActive);
    gl.uniform1f(this.uniformLocations.u_split_pos, splitPos);

    // Basic uniforms
    gl.uniform1f(this.uniformLocations.u_exposure, adjustments.exposure);
    gl.uniform1f(this.uniformLocations.u_contrast, adjustments.contrast);
    gl.uniform1f(this.uniformLocations.u_highlights, adjustments.highlights);
    gl.uniform1f(this.uniformLocations.u_shadows, adjustments.shadows);
    gl.uniform1f(this.uniformLocations.u_whites, adjustments.whites);
    gl.uniform1f(this.uniformLocations.u_blacks, adjustments.blacks);
    gl.uniform1f(this.uniformLocations.u_temperature, adjustments.temperature);
    gl.uniform1f(this.uniformLocations.u_tint, adjustments.tint);
    gl.uniform1f(this.uniformLocations.u_saturation, adjustments.saturation);
    gl.uniform1f(this.uniformLocations.u_vibrance, adjustments.vibrance);
    gl.uniform1f(this.uniformLocations.u_clarity, adjustments.clarity);
    gl.uniform1f(this.uniformLocations.u_preset_strength, adjustments.presetStrength);

    // HSL Uniforms
    const hsl = adjustments.hsl;
    gl.uniform3f(this.uniformLocations.u_hsl_red, hsl.red.hue, hsl.red.saturation, hsl.red.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_orange, hsl.orange.hue, hsl.orange.saturation, hsl.orange.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_yellow, hsl.yellow.hue, hsl.yellow.saturation, hsl.yellow.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_green, hsl.green.hue, hsl.green.saturation, hsl.green.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_cyan, hsl.cyan.hue, hsl.cyan.saturation, hsl.cyan.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_blue, hsl.blue.hue, hsl.blue.saturation, hsl.blue.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_purple, hsl.purple.hue, hsl.purple.saturation, hsl.purple.luminance);
    gl.uniform3f(this.uniformLocations.u_hsl_magenta, hsl.magenta.hue, hsl.magenta.saturation, hsl.magenta.luminance);

    // Film Effects
    gl.uniform1f(this.uniformLocations.u_grain_amount, adjustments.grainAmount);
    gl.uniform1f(this.uniformLocations.u_grain_size, adjustments.grainSize);
    gl.uniform1f(this.uniformLocations.u_grain_roughness, adjustments.grainRoughness);

    // Dust
    const dustTypes = { 'none': 0, 'fine-specks': 1, 'film-scratches': 2, 'vintage-dust': 3, 'heavy-grunge': 4 };
    gl.uniform1i(this.uniformLocations.u_dust_type, dustTypes[adjustments.dustType] || 0);
    gl.uniform1f(this.uniformLocations.u_dust_amount, adjustments.dustAmount);

    // Light Leak
    const leakTypes = { 'none': 0, 'sunset': 1, 'side-flare': 2, 'prism-beam': 3, 'corner-burn': 4, 'retro-streak': 5 };
    gl.uniform1i(this.uniformLocations.u_leak_type, leakTypes[adjustments.lightLeakType] || 0);
    gl.uniform1f(this.uniformLocations.u_leak_amount, adjustments.lightLeakAmount);
    gl.uniform1f(this.uniformLocations.u_leak_warmth, adjustments.lightLeakWarmth);

    // Glow / Halation
    gl.uniform1f(this.uniformLocations.u_glow_amount, adjustments.glowAmount);
    gl.uniform1f(this.uniformLocations.u_glow_radius, adjustments.glowRadius);

    // Prism / Chromatic Aberration
    gl.uniform1f(this.uniformLocations.u_prism_amount, adjustments.prismAmount);

    // Vignette
    gl.uniform1f(this.uniformLocations.u_vignette_amount, adjustments.vignetteAmount);
    gl.uniform1f(this.uniformLocations.u_vignette_roundness, adjustments.vignetteRoundness);

    // Blur / Tilt Shift
    const blurModes = { 'none': 0, 'radial': 1, 'linear': 2 };
    gl.uniform1i(this.uniformLocations.u_blur_mode, blurModes[adjustments.blurMode] || 0);
    gl.uniform1f(this.uniformLocations.u_blur_amount, adjustments.blurAmount);
    gl.uniform2f(this.uniformLocations.u_blur_center, adjustments.blurCenter[0], adjustments.blurCenter[1]);

    // VHS
    gl.uniform1f(this.uniformLocations.u_vhs_amount, adjustments.vhsAmount);

    // Flip
    gl.uniform2f(this.uniformLocations.u_flip, adjustments.flipH ? 1.0 : 0.0, adjustments.flipV ? 1.0 : 0.0);

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  public renderHighResOffscreen(
    sourceImg: HTMLImageElement | HTMLCanvasElement,
    width: number,
    height: number,
    adjustments: Adjustments
  ): HTMLCanvasElement {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;

    const offEngine = new WebGLFilterEngine(offCanvas);
    offEngine.setSource(sourceImg);
    offEngine.uploadTexture();
    offEngine.render(adjustments, 'none', 0.5, 1.0);

    return offCanvas;
  }

  public destroy() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.gl) {
      if (this.texture) this.gl.deleteTexture(this.texture);
      if (this.positionBuffer) this.gl.deleteBuffer(this.positionBuffer);
      if (this.texCoordBuffer) this.gl.deleteBuffer(this.texCoordBuffer);
      if (this.program) this.gl.deleteProgram(this.program);
    }
  }
}

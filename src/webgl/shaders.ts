/**
 * WebGL Shaders for LumenLab Film Engine
 */

export const VERTEX_SHADER_SOURCE = `
attribute vec2 a_position;
attribute vec2 a_texCoord;

varying vec2 v_texCoord;

void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`;

export const FRAGMENT_SHADER_SOURCE = `
precision highp float;

varying vec2 v_texCoord;

uniform sampler2D u_image;
uniform vec2 u_resolution;
uniform float u_time;

// Compare slider
uniform float u_compare_active; // 0 = normal, 1 = compare split, 2 = show original
uniform float u_split_pos;      // 0.0 to 1.0

// Basic adjustments
uniform float u_exposure;       // -1.0 to 1.0
uniform float u_contrast;       // -1.0 to 1.0
uniform float u_highlights;     // -1.0 to 1.0
uniform float u_shadows;        // -1.0 to 1.0
uniform float u_whites;         // -1.0 to 1.0
uniform float u_blacks;         // -1.0 to 1.0
uniform float u_temperature;    // -1.0 to 1.0
uniform float u_tint;           // -1.0 to 1.0
uniform float u_saturation;     // -1.0 to 1.0
uniform float u_vibrance;       // -1.0 to 1.0
uniform float u_clarity;        // -1.0 to 1.0

// HSL 8-Channel Adjustments: vec3(hue, sat, lum)
uniform vec3 u_hsl_red;
uniform vec3 u_hsl_orange;
uniform vec3 u_hsl_yellow;
uniform vec3 u_hsl_green;
uniform vec3 u_hsl_cyan;
uniform vec3 u_hsl_blue;
uniform vec3 u_hsl_purple;
uniform vec3 u_hsl_magenta;

// Tone Curves (256x1 RGBA LUT for Master + RGB channels)
uniform sampler2D u_curve_lut;
uniform float u_curves_active;

// Preset strength
uniform float u_preset_strength;

// Film Effects
uniform float u_grain_amount;
uniform float u_grain_size;
uniform float u_grain_roughness;

uniform int u_dust_type;        // 0=none, 1=fine, 2=scratches, 3=vintage, 4=grunge
uniform float u_dust_amount;

uniform int u_leak_type;        // 0=none, 1=sunset, 2=side-flare, 3=prism-beam, 4=corner-burn, 5=retro-streak
uniform float u_leak_amount;
uniform float u_leak_warmth;

uniform float u_glow_amount;
uniform float u_glow_radius;

uniform float u_prism_amount;
uniform float u_vignette_amount;
uniform float u_vignette_roundness;

uniform int u_blur_mode;        // 0=none, 1=radial, 2=linear
uniform float u_blur_amount;
uniform vec2 u_blur_center;

uniform float u_vhs_amount;

// Crop / Flip
uniform vec2 u_flip;

// --- Helper Functions ---

// RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// Pseudo random
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

// Simplex-style 2D Noise
float noise(vec2 st) {
  vec2 i = floor(st);
  vec2 f = fract(st);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// HSL Color Channel Weight Calculation
float getHueWeight(float h, float targetH, float width) {
  float diff = abs(h - targetH);
  if (diff > 0.5) diff = 1.0 - diff;
  return smoothstep(width, 0.0, diff);
}

// Apply HSL adjustments
vec3 applyHSL(vec3 color) {
  vec3 hsv = rgb2hsv(color);
  float h = hsv.x;

  // Hues on 0..1 circle:
  // Red ~ 0.0 / 1.0, Orange ~ 0.08, Yellow ~ 0.16, Green ~ 0.33, Cyan ~ 0.5, Blue ~ 0.66, Purple ~ 0.78, Magenta ~ 0.88
  float wRed = max(getHueWeight(h, 0.0, 0.08), getHueWeight(h, 1.0, 0.08));
  float wOrange = getHueWeight(h, 0.08, 0.07);
  float wYellow = getHueWeight(h, 0.16, 0.08);
  float wGreen = getHueWeight(h, 0.33, 0.12);
  float wCyan = getHueWeight(h, 0.5, 0.1);
  float wBlue = getHueWeight(h, 0.66, 0.12);
  float wPurple = getHueWeight(h, 0.78, 0.09);
  float wMagenta = getHueWeight(h, 0.88, 0.09);

  float totalW = wRed + wOrange + wYellow + wGreen + wCyan + wBlue + wPurple + wMagenta + 0.0001;

  vec3 delta = (u_hsl_red * wRed +
                u_hsl_orange * wOrange +
                u_hsl_yellow * wYellow +
                u_hsl_green * wGreen +
                u_hsl_cyan * wCyan +
                u_hsl_blue * wBlue +
                u_hsl_purple * wPurple +
                u_hsl_magenta * wMagenta) / totalW;

  // Apply Hue shift
  hsv.x = fract(hsv.x + delta.x * 0.15);
  // Apply Saturation multiplier
  hsv.y = clamp(hsv.y * (1.0 + delta.y), 0.0, 1.0);
  // Apply Luminance
  hsv.z = clamp(hsv.z + delta.z * 0.3, 0.0, 1.0);

  return hsv2rgb(hsv);
}

// Procedural Dust & Scratches
vec3 applyDust(vec3 col, vec2 uv, float seed) {
  if (u_dust_amount <= 0.001 || u_dust_type == 0) return col;

  float d = 0.0;
  vec2 uvSeed = uv + vec2(seed * 0.13, seed * 0.29);

  if (u_dust_type == 1) {
    // Fine specks
    float n = hash(floor(uvSeed * 450.0));
    if (n > 0.996) d += 0.6;
    float n2 = hash(floor(uvSeed * 800.0));
    if (n2 > 0.998) d += 0.8;
  } else if (u_dust_type == 2) {
    // Scratches & vertical film hairs
    float n = hash(floor(uvSeed * 300.0));
    if (n > 0.994) d += 0.7;
    // vertical scratch line
    float scratchX = fract(seed * 17.13);
    float dist = abs(uv.x - scratchX);
    if (dist < 0.0015) {
      d += smoothstep(0.0015, 0.0, dist) * (0.4 + 0.6 * noise(vec2(uv.y * 30.0, seed)));
    }
  } else if (u_dust_type == 3) {
    // Vintage dust & fibers
    float n1 = hash(floor(uvSeed * 350.0));
    if (n1 > 0.993) d += 0.75;
    float fiber = noise(uvSeed * 120.0);
    if (fiber > 0.88) d += (fiber - 0.88) * 6.0;
  } else if (u_dust_type == 4) {
    // Heavy grunge & splotches
    float n1 = hash(floor(uvSeed * 200.0));
    if (n1 > 0.985) d += 0.85;
    float blotch = noise(uvSeed * 40.0);
    if (blotch > 0.78) d += (blotch - 0.78) * 3.5;
  }

  // Blend dust
  vec3 dustCol = vec3(0.95, 0.92, 0.85);
  return mix(col, dustCol, clamp(d * u_dust_amount, 0.0, 0.95));
}

// Procedural Light Leak
vec3 applyLightLeak(vec3 col, vec2 uv) {
  if (u_leak_amount <= 0.001 || u_leak_type == 0) return col;

  vec3 leakColor = mix(vec3(1.0, 0.45, 0.15), vec3(1.0, 0.8, 0.3), u_leak_warmth);
  float leak = 0.0;

  if (u_leak_type == 1) {
    // Sunset Top/Corner flare
    float d1 = distance(uv, vec2(0.05, 0.05));
    leak += smoothstep(0.85, 0.05, d1) * 1.2;
    float d2 = distance(uv, vec2(0.2, 0.0));
    leak += smoothstep(0.6, 0.0, d2) * 0.8;
  } else if (u_leak_type == 2) {
    // Side Flare (Right Edge glow)
    float d = abs(uv.x - 1.0);
    leak += smoothstep(0.45, 0.0, d) * (0.8 + 0.3 * sin(uv.y * 6.0));
    leakColor = mix(vec3(1.0, 0.3, 0.1), vec3(1.0, 0.6, 0.2), uv.y);
  } else if (u_leak_type == 3) {
    // Prism Beam (Diagonal rainbow flare)
    float diag = abs((uv.x + uv.y * 0.6) - 0.65);
    leak += smoothstep(0.35, 0.0, diag) * 1.1;
    leakColor = mix(vec3(1.0, 0.3, 0.6), vec3(0.3, 0.8, 1.0), uv.x);
  } else if (u_leak_type == 4) {
    // Corner Burn (Bottom-Left deep burn)
    float d = distance(uv, vec2(0.0, 1.0));
    leak += smoothstep(0.75, 0.0, d) * 1.3;
    leakColor = vec3(1.0, 0.25, 0.05);
  } else if (u_leak_type == 5) {
    // Retro Streaks (Horizontal organic film burns)
    float s1 = smoothstep(0.25, 0.0, abs(uv.y - 0.2));
    float s2 = smoothstep(0.2, 0.0, abs(uv.y - 0.75));
    leak += (s1 * 0.8 + s2 * 0.6) * (1.0 - uv.x * 0.5);
  }

  leak *= u_leak_amount;
  // Screen blend mode: 1 - (1 - a) * (1 - b)
  return 1.0 - (1.0 - col) * (1.0 - leakColor * leak);
}

void main() {
  vec2 uv = v_texCoord;

  // Handle Flip
  if (u_flip.x > 0.5) uv.x = 1.0 - uv.x;
  if (u_flip.y > 0.5) uv.y = 1.0 - uv.y;

  // Check compare mode:
  // If u_compare_active == 2.0 (hold original), or split position
  if (u_compare_active > 1.5) {
    gl_FragColor = texture2D(u_image, uv);
    return;
  }

  // If split compare is active and pixel is to the left of the split bar
  if (u_compare_active > 0.5 && uv.x < u_split_pos) {
    // Draw split line if near boundary
    if (abs(uv.x - u_split_pos) < (1.5 / u_resolution.x)) {
      gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    } else {
      gl_FragColor = texture2D(u_image, uv);
    }
    return;
  } else if (u_compare_active > 0.5 && abs(uv.x - u_split_pos) < (1.5 / u_resolution.x)) {
    gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
    return;
  }

  // --- Chromatic Aberration / Prism & Glass Dispersion ---
  vec3 color;
  if (u_prism_amount > 0.001) {
    vec2 centerVec = uv - vec2(0.5);
    float dist = length(centerVec);
    vec2 normDir = (dist > 0.0001) ? (centerVec / dist) : vec2(0.7071, 0.7071);
    
    // Combining radial optical lens aberration with diagonal glass prism refraction
    vec2 dispersionDir = normalize(normDir * 0.7 + vec2(0.65, 0.35) * 0.3);
    
    // Smooth non-linear scale: visible across mid-frame and intensifying toward high radius
    float maxShift = u_prism_amount * 0.045 * (0.35 + 0.65 * pow(clamp(dist * 1.414, 0.0, 1.0), 1.2));
    
    // Multi-spectral 6-band waveband sampling (Red, Orange, Green, Cyan, Blue, Violet)
    vec2 shiftR = dispersionDir * (maxShift * 1.5);
    vec2 shiftO = dispersionDir * (maxShift * 0.85);
    vec2 shiftG = vec2(0.0);
    vec2 shiftC = -dispersionDir * (maxShift * 0.85);
    vec2 shiftB = -dispersionDir * (maxShift * 1.5);
    vec2 shiftV = -dispersionDir * (maxShift * 2.1);

    vec3 sampleR = texture2D(u_image, clamp(uv + shiftR, 0.0, 1.0)).rgb;
    vec3 sampleO = texture2D(u_image, clamp(uv + shiftO, 0.0, 1.0)).rgb;
    vec3 sampleG = texture2D(u_image, uv).rgb;
    vec3 sampleC = texture2D(u_image, clamp(uv + shiftC, 0.0, 1.0)).rgb;
    vec3 sampleB = texture2D(u_image, clamp(uv + shiftB, 0.0, 1.0)).rgb;
    vec3 sampleV = texture2D(u_image, clamp(uv + shiftV, 0.0, 1.0)).rgb;

    // Continuous spectral reconstruction
    float r = sampleR.r * 0.65 + sampleO.r * 0.35;
    float g = sampleO.g * 0.18 + sampleG.g * 0.64 + sampleC.g * 0.18;
    float b = sampleC.b * 0.35 + sampleB.b * 0.45 + sampleV.b * 0.20;
    
    color = vec3(r, g, b);
  } else {
    color = texture2D(u_image, uv).rgb;
  }

  vec3 originalColor = color;

  // --- Tilt-Shift / Radial Blur (Approximation) ---
  if (u_blur_mode > 0 && u_blur_amount > 0.001) {
    float blurMask = 0.0;
    if (u_blur_mode == 1) {
      // Radial from center
      float dist = distance(uv, u_blur_center);
      blurMask = smoothstep(0.2, 0.65, dist);
    } else if (u_blur_mode == 2) {
      // Linear
      float dist = abs(uv.y - u_blur_center.y);
      blurMask = smoothstep(0.12, 0.45, dist);
    }

    if (blurMask > 0.01) {
      float blurRadius = blurMask * u_blur_amount * 0.008;
      vec3 blurSample = vec3(0.0);
      blurSample += texture2D(u_image, uv + vec2(blurRadius, 0.0)).rgb;
      blurSample += texture2D(u_image, uv - vec2(blurRadius, 0.0)).rgb;
      blurSample += texture2D(u_image, uv + vec2(0.0, blurRadius)).rgb;
      blurSample += texture2D(u_image, uv - vec2(0.0, blurRadius)).rgb;
      blurSample += texture2D(u_image, uv + vec2(blurRadius * 0.7, blurRadius * 0.7)).rgb;
      blurSample += texture2D(u_image, uv - vec2(blurRadius * 0.7, blurRadius * 0.7)).rgb;
      blurSample += color * 2.0;
      color = blurSample / 8.0;
    }
  }

  // --- 1. Exposure ---
  color = color * pow(2.0, u_exposure * 1.5);

  // --- 2. Highlights & Shadows ---
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  float shadowMask = 1.0 - smoothstep(0.0, 0.5, luminance);
  float highlightMask = smoothstep(0.5, 1.0, luminance);

  color += u_shadows * 0.35 * shadowMask;
  color += u_highlights * 0.35 * highlightMask;

  // --- 3. Whites & Blacks ---
  color += u_whites * 0.25 * smoothstep(0.7, 1.0, luminance);
  color += u_blacks * 0.25 * (1.0 - smoothstep(0.0, 0.3, luminance));

  // --- 4. Contrast ---
  color = clamp(color, 0.0, 1.0);
  color = (color - 0.5) * (1.0 + u_contrast * 0.9) + 0.5;

  // --- 5. Temperature & Tint (Color Balance) ---
  vec3 tempShift = vec3(u_temperature * 0.18, 0.0, -u_temperature * 0.18);
  vec3 tintShift = vec3(u_tint * 0.12, -u_tint * 0.12, u_tint * 0.12);
  color = color + tempShift + tintShift;

  // --- 6. Clarity (Midtone Boost) ---
  if (abs(u_clarity) > 0.001) {
    float midtoneMask = sin(clamp(luminance, 0.0, 1.0) * 3.14159265);
    color = mix(color, (color - 0.5) * (1.0 + u_clarity * 0.4) + 0.5, midtoneMask);
  }

  // --- 6b. Tone Curves (Master + RGB Channels) ---
  if (u_curves_active > 0.5) {
    color.r = texture2D(u_curve_lut, vec2(clamp(color.r, 0.0, 1.0), 0.5)).r;
    color.g = texture2D(u_curve_lut, vec2(clamp(color.g, 0.0, 1.0), 0.5)).g;
    color.b = texture2D(u_curve_lut, vec2(clamp(color.b, 0.0, 1.0), 0.5)).b;
  }

  // --- 7. HSL Selective Grading ---
  color = applyHSL(color);

  // --- 8. Saturation & Vibrance ---
  float lumAfter = dot(color, vec3(0.2126, 0.7152, 0.0722));
  // Saturation
  color = mix(vec3(lumAfter), color, 1.0 + u_saturation * 0.9);

  // Vibrance (smart boost on less saturated colors)
  float maxC = max(color.r, max(color.g, color.b));
  float minC = min(color.r, min(color.g, color.b));
  float curSat = (maxC - minC) / (maxC + 0.001);
  float vibFactor = (1.0 - curSat) * u_vibrance * 0.8;
  color = mix(vec3(lumAfter), color, 1.0 + vibFactor);

  // --- 9. Glow / Halation (Dreamy Bloom on highlights) ---
  if (u_glow_amount > 0.001) {
    float highLum = smoothstep(0.65 - u_glow_radius * 0.2, 1.0, lumAfter);
    vec3 glowTint = vec3(1.0, 0.88, 0.75); // Warm editorial film bloom
    color = mix(color, 1.0 - (1.0 - color) * (1.0 - glowTint * highLum * 0.7), u_glow_amount);
  }

  // --- 10. Blend Preset Intensity ---
  if (u_preset_strength < 0.999) {
    color = mix(originalColor, color, u_preset_strength);
  }

  // --- 11. Light Leaks ---
  color = applyLightLeak(color, uv);

  // --- 12. Dust & Scratches ---
  color = applyDust(color, uv, u_time);

  // --- 13. Film Grain ---
  if (u_grain_amount > 0.001) {
    vec2 grainUv = uv * u_resolution / (u_grain_size * 1.5);
    // Add time offset so grain dances on video or webcam
    grainUv += vec2(sin(u_time * 12.0) * 100.0, cos(u_time * 17.0) * 100.0);
    float g = noise(grainUv);
    float grain = (g - 0.5) * 2.0;

    // Luminance-dependent grain (more visible in midtones and shadows, like authentic film emulsion)
    float grainWeight = 1.0 - abs(lumAfter - 0.5) * 1.2;
    grainWeight = max(0.2, grainWeight);

    color += grain * u_grain_amount * 0.28 * grainWeight;
  }

  // --- 14. Vignette ---
  if (abs(u_vignette_amount) > 0.001) {
    float d = distance(uv, vec2(0.5, 0.5)) * (1.0 / (u_vignette_roundness * 0.5 + 0.5));
    float vig = smoothstep(0.4, 0.9, d);
    if (u_vignette_amount > 0.0) {
      color = mix(color, color * (1.0 - u_vignette_amount * 0.75), vig);
    } else {
      color = mix(color, color + abs(u_vignette_amount) * 0.6, vig);
    }
  }

  // --- 15. VHS / Retro Scanlines & Glitch ---
  if (u_vhs_amount > 0.001) {
    float scanline = sin(uv.y * u_resolution.y * 1.2 + u_time * 5.0) * 0.5 + 0.5;
    color = mix(color, color * (0.85 + 0.15 * scanline), u_vhs_amount * 0.7);
    // subtle horizontal glitch line
    float glitchY = fract(u_time * 0.3);
    if (abs(uv.y - glitchY) < 0.004) {
      color = color * 1.2;
    }
  }

  color = clamp(color, 0.0, 1.0);
  gl_FragColor = vec4(color, 1.0);
}
`;

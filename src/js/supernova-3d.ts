/** Ray-marched emissive gas in world space, seen through a moving perspective camera. */
const vertexSource = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const fragmentSource = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
out vec4 fragColor;

float hash(vec3 p) {
  p = fract(p * .3183099 + vec3(.1, .2, .3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x),
                 mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
             mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x),
                 mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = .55;
  for(int i=0; i<3; i++) {
    v += a * noise(p);
    p = mat3(.00,.80,.60, -.80,.36,-.48, -.60,-.48,.64) * p * 2.13 + 7.1;
    a *= .48;
  }
  return v;
}
mat2 rotate(float a) { return mat2(cos(a),-sin(a),sin(a),cos(a)); }

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - uResolution) / uResolution.y;
  float t = uTime;
  float ignition = smoothstep(.65, 1.05, t);
  float age = max(0.0, t - .8);
  float expansion = 1.0 - exp(-age * .65);
  float radius = mix(.36 - .17*smoothstep(0.0,.7,t), 3.5, expansion);
  float flash = exp(-pow((t-1.05)*4.2, 2.0));
  float decay = 1.0 - smoothstep(3.8,5.4,t);

  // A gently orbiting camera reveals the near and far sides of the gas shell.
  vec3 eye = vec3(.5*sin(t*.12), .22*cos(t*.16), 6.0-.25*expansion);
  vec3 forward = normalize(-eye);
  vec3 right = normalize(cross(forward, vec3(0,1,0)));
  vec3 up = cross(right, forward);
  vec3 ray = normalize(forward*1.8 + uv.x*right + uv.y*up);
  vec3 color = vec3(.0015,.002,.004);
  float transmission = 1.0;
  float bound = radius * 1.45;
  float b = dot(eye,ray);
  float hit = b*b - dot(eye,eye) + bound*bound;
  if(hit > 0.0) {
    float nearT = max(0.0,-b-sqrt(hit));
    float farT = -b+sqrt(hit);
    float stepSize = (farT-nearT)/48.0;
    float jitter = hash(vec3(gl_FragCoord.xy, 1.0));
    for(int i=0;i<48;i++) {
      vec3 p = eye + ray*(nearT+(float(i)+jitter)*stepSize);
      vec3 q = p / max(radius,.1);
      q.xz = rotate(t*.075) * q.xz;
      q.xy = rotate(.22) * q.xy;
      float r = length(q);
      // Domain warping breaks the shell into rolling, filamentary 3D clouds.
      float turbulence = fbm(q*3.8 + vec3(0,-age*.17,age*.09));
      float fine = fbm(q*10.0 + turbulence*2.5);
      float shell = exp(-pow((r - .79 - (turbulence-.5)*.55)/.095,2.0));
      float strands = pow(smoothstep(.36,.72,fine), 2.0);
      float fingers = pow(noise(normalize(q)*32.0), 14.0) * exp(-pow((r-1.04)/.22,2.0))*3.0;
      float density = shell * strands * (1.0 + turbulence*2.0) + fingers;
      float core = exp(-r*r*24.0) * (1.0-ignition*.96);
      density = (density*ignition + core*3.5) * decay;
      float opacity = 1.0-exp(-density*stepSize*2.0);
      float heat = clamp((1.0-r)*1.4 + fine*.6,0.0,1.0);
      vec3 cold = vec3(.10,.42,.9);
      vec3 hot = mix(vec3(1.0,.12,.018),vec3(1.0,.65,.23),heat);
      vec3 gas = mix(cold,hot,smoothstep(.18,.72,heat));
      gas *= (.7 + fine*2.5) * (.4 + .6*max(0.0,dot(normalize(q),normalize(vec3(-1,1,2)))));
      gas += vec3(1.0,.83,.55)*core*8.0;
      color += transmission * opacity * gas;
      transmission *= 1.0-opacity*.92;
      if(transmission < .025) break;
    }
  }

  // An inclined equatorial shock front is intersected in 3D, not drawn as a HUD ring.
  vec3 normal = normalize(vec3(.12,.75,1.0));
  float planeT = -dot(eye,normal)/dot(ray,normal);
  vec3 planeP = eye+ray*planeT;
  float shockRadius = .2+age*2.35;
  float shock = exp(-pow((length(planeP)-shockRadius)/(.025+age*.028),2.0));
  float shockFade = ignition*exp(-age*.7)*decay;
  if(planeT>0.0) color += vec3(.22,.55,1.0)*shock*shockFade*1.6;

  // Optical bloom and diffraction from the central light source.
  float screenR = length(uv);
  float power = (.008 + flash*.22 + (1.0-ignition)*.055)*decay;
  color += vec3(1.0,.62,.28)*power/(screenR*screenR+.012);
  color += vec3(1.0,.91,.74)*exp(-screenR*screenR/(.0005+flash*.012))*3.0*decay;
  float streak = exp(-abs(uv.y)*180.0) * exp(-abs(uv.x)*1.1);
  float diagonal = exp(-abs(uv.x*.7+uv.y)*210.0)*exp(-screenR*5.0);
  color += vec3(.38,.64,1.0)*(streak+diagonal*.5)*(.12+flash*1.3)*decay;

  // Distant stars stay behind the expanding volume.
  vec2 cell = floor((uv+vec2(t*.001,0))*220.0);
  float seed = hash(vec3(cell,13.0));
  vec2 point = fract((uv+vec2(t*.001,0))*220.0)-.5;
  float stars = smoothstep(.996,1.0,seed)*exp(-dot(point,point)*70.0);
  color += vec3(.5,.66,1.0)*stars*transmission;
  color *= 1.0-smoothstep(.4,2.3,screenR)*.42;
  color = 1.0-exp(-color*.9);
  color = pow(color,vec3(.85));
  fragColor = vec4(color,1.0);
}`;

export interface Supernova3D {
  render(seconds: number): void;
  dispose(): void;
}

export function createSupernova3D(canvas: HTMLCanvasElement): Supernova3D | null {
  const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false });
  if (!gl) return null;
  const shaders: WebGLShader[] = [];
  const program = gl.createProgram();
  if (!program) return null;
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]] as const) {
    const shader = gl.createShader(type);
    if (!shader) { gl.deleteProgram(program); shaders.forEach(s => gl.deleteShader(s)); return null; }
    shaders.push(shader);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.warn('Supernova shader could not compile:', gl.getShaderInfoLog(shader));
      shaders.forEach(s => gl.deleteShader(s));
      gl.deleteProgram(program);
      return null;
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  shaders.forEach(s => gl.deleteShader(s));
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) { gl.deleteProgram(program); return null; }
  const resolution = gl.getUniformLocation(program, 'uResolution');
  const time = gl.getUniformLocation(program, 'uTime');
  let disposed = false;
  let pixelBudget = 360_000;
  let sizeDirty = true;
  let previousTime: number | undefined;
  let lastEvaluation = 0;
  const intervals: number[] = [];
  const onResize = (): void => { sizeDirty = true; };
  window.addEventListener('resize', onResize);
  return {
    render(seconds) {
      if (disposed || gl.isContextLost()) return;
      if (previousTime !== undefined) {
        intervals.push((seconds - previousTime) * 1000);
        if (intervals.length > 12) intervals.shift();
      }
      previousTime = seconds;
      if (seconds - lastEvaluation >= .25 && intervals.length === 12) {
        lastEvaluation = seconds;
        const sorted = [...intervals].sort((a, b) => a - b);
        const median = (sorted[5]! + sorted[6]!) / 2;
        if (median > 20 && pixelBudget > 120_000) {
          pixelBudget = Math.max(120_000, pixelBudget * .75);
          sizeDirty = true;
        }
      }
      if (sizeDirty) {
        const rect = canvas.getBoundingClientRect();
        const ratio = Math.min(1, Math.sqrt(pixelBudget / Math.max(1, rect.width * rect.height)));
        const width = Math.max(1, Math.floor(rect.width * ratio));
        const height = Math.max(1, Math.floor(rect.height * ratio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }
        sizeDirty = false;
      }
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.useProgram(program);
      gl.uniform2f(resolution,canvas.width,canvas.height);
      gl.uniform1f(time,seconds);
      gl.drawArrays(gl.TRIANGLES,0,3);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      gl.useProgram(null);
      gl.deleteProgram(program);
      window.removeEventListener('resize', onResize);
    },
  };
}

import * as THREE from "three";
import vertSrc from "./shaders/fullscreen.vert.glsl?raw";
import fragSrc from "./shaders/bridgeNight.frag.glsl?raw";

function makeNoiseTex() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);

  const hash = (n) => {
    const v = Math.sin(n) * 43758.5453123;
    return v - Math.floor(v);
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const n1 = hash(x * 127.1 + y * 311.7);
      const n2 = hash(x * 269.5 + y * 183.3);
      data[i] = n1 * 255;
      data[i + 1] = n2 * 255;
      data[i + 2] = n1 * 255;
      data[i + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.needsUpdate = true;

  return tex;
}

export function startBridgeNight({ canvas, wrap }) {
  if (!canvas) {
    throw new Error("Missing #glcanvas element");
  }
  if (!wrap) {
    throw new Error("Missing #canvas-wrap element");
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });

  const getPixelRatio = () => Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(getPixelRatio());

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const geometry = new THREE.PlaneGeometry(2, 2);

  const noiseTex = makeNoiseTex();
  const mouse = new THREE.Vector4(0, 0, 0, 0);

  const material = new THREE.ShaderMaterial({
    vertexShader: vertSrc,
    fragmentShader: fragSrc,
    uniforms: {
      iResolution: { value: new THREE.Vector2(1, 1) },
      iTime: { value: 0 },
      iMouse: { value: mouse },
      iChannel0: { value: noiseTex },
    },
  });

  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  let pointerDown = false;
  const pointerIdRef = { value: null };

  const getPixelSize = () => {
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const pr = getPixelRatio();
    return {
      w,
      h,
      pw: Math.round(w * pr),
      ph: Math.round(h * pr),
    };
  };

  const updateMouseFromClientPoint = (clientX, clientY, { setClick }) => {
    const rect = canvas.getBoundingClientRect();
    const { pw, ph } = getPixelSize();
    if (rect.width <= 0 || rect.height <= 0 || pw <= 0 || ph <= 0) return;

    const x = (clientX - rect.left) * (pw / rect.width);
    const y = ph - (clientY - rect.top) * (ph / rect.height);

    mouse.x = x;
    mouse.y = y;
    if (setClick) {
      mouse.z = x;
      mouse.w = y;
    }
  };

  const onPointerDown = (e) => {
    pointerDown = true;
    pointerIdRef.value = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    updateMouseFromClientPoint(e.clientX, e.clientY, { setClick: true });
  };

  const onPointerMove = (e) => {
    if (!pointerDown) return;
    if (pointerIdRef.value !== null && e.pointerId !== pointerIdRef.value) return;
    updateMouseFromClientPoint(e.clientX, e.clientY, { setClick: false });
  };

  const onPointerUp = (e) => {
    if (pointerIdRef.value !== null && e.pointerId !== pointerIdRef.value) return;
    pointerDown = false;
    pointerIdRef.value = null;
  };

  const onPointerCancel = () => {
    pointerDown = false;
    pointerIdRef.value = null;
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerCancel);

  const startTime = performance.now();
  let frameId = 0;

  const animate = () => {
    frameId = requestAnimationFrame(animate);

    const { w, h, pw, ph } = getPixelSize();
    const pr = getPixelRatio();
    if (renderer.getPixelRatio() !== pr) renderer.setPixelRatio(pr);

    if (renderer.domElement.width !== pw || renderer.domElement.height !== ph) {
      renderer.setSize(w, h, false);
    }

    material.uniforms.iResolution.value.set(pw, ph);
    material.uniforms.iTime.value = (performance.now() - startTime) / 1000;
    material.uniforms.iMouse.value.copy(mouse);

    renderer.render(scene, camera);
  };

  animate();

  return {
    dispose() {
      cancelAnimationFrame(frameId);

      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerCancel);

      geometry.dispose();
      material.dispose();
      noiseTex.dispose();
      renderer.dispose();
    },
  };
}


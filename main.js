let scene, camera, renderer, controls;
let currentModule = 'optics';

// Optics Objects
let glassBlock, incidentRay, refractedRay, normalLine;
let incidentAngleDeg = 30; // Incident Angle (i)
let nGlass = 1.52; // Refractive index of Crown Glass

const container = document.getElementById('canvas-container');
const controlsPanel = document.getElementById('controls-panel');
const metricsContent = document.getElementById('metrics-content');

const tabOptics = document.getElementById('tab-optics');
const tabOrbits = document.getElementById('tab-orbits');
const tabChem = document.getElementById('tab-chem');

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f19);

  camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(0, 10, 35);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(10, 20, 10);
  scene.add(light);

  setupEventListeners();
  loadOpticsModule();
  animate();
}

function setupEventListeners() {
  tabOptics.addEventListener('click', () => switchTab('optics'));
  tabOrbits.addEventListener('click', () => switchTab('orbits'));
  tabChem.addEventListener('click', () => switchTab('chem'));
  window.addEventListener('resize', onWindowResize);
}

function switchTab(moduleName) {
  currentModule = moduleName;
  [tabOptics, tabOrbits, tabChem].forEach(btn => btn.classList.remove('active'));
  
  if (moduleName === 'optics') {
    tabOptics.classList.add('active');
    loadOpticsModule();
  } else if (moduleName === 'orbits') {
    tabOrbits.classList.add('active');
    loadPlaceholderModule('Orbital Mechanics');
  } else if (moduleName === 'chem') {
    tabChem.classList.add('active');
    loadPlaceholderModule('Chemistry Molecular Lab');
  }
}

function clearScene() {
  while (scene.children.length > 0) {
    const obj = scene.children.pop();
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) obj.material.dispose();
  }
  // Re-add lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(10, 20, 10);
  scene.add(light);
}

// --- OPTICS MODULE (Snell's Law: n1 * sin(i) = n2 * sin(r)) ---
function loadOpticsModule() {
  clearScene();

  // Glass Block (Medium 2)
  const glassGeom = new THREE.BoxGeometry(20, 10, 4);
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.3,
    roughness: 0.1,
    transmission: 0.9
  });
  glassBlock = new THREE.Mesh(glassGeom, glassMat);
  glassBlock.position.set(0, -5, 0);
  scene.add(glassBlock);

  // Normal Line (Dashed)
  const normalGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 10, 0),
    new THREE.Vector3(0, -12, 0)
  ]);
  const normalMat = new THREE.LineDashedMaterial({ color: 0x9ca3af, dashSize: 0.5, gapSize: 0.5 });
  normalLine = new THREE.Line(normalGeom, normalMat);
  normalLine.computeLineDistances();
  scene.add(normalLine);

  renderOpticsUI();
  updateOpticsSimulation();
}

function renderOpticsUI() {
  controlsPanel.innerHTML = `
    <h3>Optics Controls</h3>
    <div class="control-group">
      <label>Angle of Incidence (i): <span id="val-angle">${incidentAngleDeg}°</span></label>
      <input type="range" id="slider-angle" class="slider-input" min="0" max="80" value="${incidentAngleDeg}">
    </div>
    <div class="control-group">
      <label>Medium 2 Material:</label>
      <select id="select-medium" style="width:100%; padding:6px; background:#111827; color:#fff; border:1px solid #374151; border-radius:6px;">
        <option value="1.52">Crown Glass (n = 1.52)</option>
        <option value="1.33">Water (n = 1.33)</option>
        <option value="2.42">Diamond (n = 2.42)</option>
      </select>
    </div>
  `;

  document.getElementById('slider-angle').addEventListener('input', (e) => {
    incidentAngleDeg = parseFloat(e.target.value);
    document.getElementById('val-angle').textContent = `${incidentAngleDeg}°`;
    updateOpticsSimulation();
  });

  document.getElementById('select-medium').addEventListener('change', (e) => {
    nGlass = parseFloat(e.target.value);
    updateOpticsSimulation();
  });
}

function updateOpticsSimulation() {
  if (incidentRay) scene.remove(incidentRay);
  if (refractedRay) scene.remove(refractedRay);

  const radI = (incidentAngleDeg * Math.PI) / 180;
  
  // Snell's Law: sin(r) = sin(i) / n2  (assuming n1 air = 1.0)
  const sinR = Math.sin(radI) / nGlass;
  const radR = Math.asin(sinR);
  const refractedAngleDeg = (radR * 180 / Math.PI).toFixed(1);

  // Calculate Ray Vectors
  const rayLength = 12;
  const startX = -Math.sin(radI) * rayLength;
  const startY = Math.cos(radI) * rayLength;
  
  const endX = Math.sin(radR) * rayLength;
  const endY = -Math.cos(radR) * rayLength;

  // Render Incident Ray (Yellow)
  const incGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(startX, startY, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  incidentRay = new THREE.Line(incGeom, new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 }));
  scene.add(incidentRay);

  // Render Refracted Ray (Cyan)
  const refGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(endX, endY, 0)
  ]);
  refractedRay = new THREE.Line(refGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 }));
  scene.add(refractedRay);

  // Update Math Metrics Panel
  metricsContent.innerHTML = `
    <div class="metric-row"><span>Air Index (n1):</span><span class="val">1.00</span></div>
    <div class="metric-row"><span>Medium Index (n2):</span><span class="val">${nGlass}</span></div>
    <div class="metric-row"><span>Angle of Incidence (i):</span><span class="val">${incidentAngleDeg}°</span></div>
    <div class="metric-row"><span>Angle of Refraction (r):</span><span class="val">${refractedAngleDeg}°</span></div>
    <div class="metric-row"><span>Snell Ratio (sin i / sin r):</span><span class="val">${nGlass}</span></div>
  `;
}

function loadPlaceholderModule(name) {
  clearScene();
  controlsPanel.innerHTML = `<h3>${name}</h3><p style="color:#9ca3af; font-size:0.85rem;">Module coming in Step 2!</p>`;
  metricsContent.innerHTML = `<div class="metric-row"><span>Status:</span><span class="val">Ready to code</span></div>`;
}

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

init();


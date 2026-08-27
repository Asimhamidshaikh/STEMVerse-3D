let scene, camera, renderer, controls;
let currentModule = 'optics';

// Optics Objects
let glassBlock, incidentRay, refractedRay, normalLine;
let incidentAngleDeg = 30;
let nGlass = 1.52;

// Orbit Physics Objects & Variables
let centralBody, satellite, orbitTrail;
let trailPoints = [];
const maxTrailPoints = 300;

// Physics Parameters
let centralMass = 1000;      // Mass of central star/planet (M)
let satelliteDist = 18;       // Initial distance (r)
let launchVelocity = 7.5;     // Tangential velocity (v)
let satellitePos, satelliteVel;
let isOrbitRunning = true;

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
  camera.position.set(0, 20, 45);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

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
    loadOrbitsModule();
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
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const light = new THREE.DirectionalLight(0xffffff, 0.8);
  light.position.set(10, 20, 10);
  scene.add(light);
}

// --- MODULE 1: OPTICS & REFRACTION ---
function loadOpticsModule() {
  clearScene();

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
  const sinR = Math.sin(radI) / nGlass;
  const radR = Math.asin(sinR);
  const refractedAngleDeg = (radR * 180 / Math.PI).toFixed(1);

  const rayLength = 12;
  const startX = -Math.sin(radI) * rayLength;
  const startY = Math.cos(radI) * rayLength;
  const endX = Math.sin(radR) * rayLength;
  const endY = -Math.cos(radR) * rayLength;

  const incGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(startX, startY, 0),
    new THREE.Vector3(0, 0, 0)
  ]);
  incidentRay = new THREE.Line(incGeom, new THREE.LineBasicMaterial({ color: 0xfacc15, linewidth: 3 }));
  scene.add(incidentRay);

  const refGeom = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(endX, endY, 0)
  ]);
  refractedRay = new THREE.Line(refGeom, new THREE.LineBasicMaterial({ color: 0x38bdf8, linewidth: 3 }));
  scene.add(refractedRay);

  metricsContent.innerHTML = `
    <div class="metric-row"><span>Air Index (n1):</span><span class="val">1.00</span></div>
    <div class="metric-row"><span>Medium Index (n2):</span><span class="val">${nGlass}</span></div>
    <div class="metric-row"><span>Angle of Incidence (i):</span><span class="val">${incidentAngleDeg}°</span></div>
    <div class="metric-row"><span>Angle of Refraction (r):</span><span class="val">${refractedAngleDeg}°</span></div>
    <div class="metric-row"><span>Snell Ratio (sin i / sin r):</span><span class="val">${nGlass}</span></div>
  `;
}

// --- MODULE 2: ORBITAL MECHANICS & GRAVITY ---
function loadOrbitsModule() {
  clearScene();

  // Central Star / Planet
  const starGeom = new THREE.SphereGeometry(3.5, 32, 32);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xfba518, emissive: 0xd97706 });
  centralBody = new THREE.Mesh(starGeom, starMat);
  scene.add(centralBody);

  // Orbiting Satellite / Planet
  const satGeom = new THREE.SphereGeometry(1.0, 24, 24);
  const satMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
  satellite = new THREE.Mesh(satGeom, satMat);
  scene.add(satellite);

  // Dynamic Trajectory Trail Line
  const trailGeom = new THREE.BufferGeometry();
  const trailMat = new THREE.LineBasicMaterial({ color: 0x818cf8, opacity: 0.7, transparent: true });
  orbitTrail = new THREE.Line(trailGeom, trailMat);
  scene.add(orbitTrail);

  renderOrbitsUI();
  resetOrbitSimulation();
}

function renderOrbitsUI() {
  controlsPanel.innerHTML = `
    <h3>Orbit Controls</h3>
    <div class="control-group">
      <label>Central Mass (M): <span id="val-mass">${centralMass}</span></label>
      <input type="range" id="slider-mass" class="slider-input" min="300" max="2500" value="${centralMass}">
    </div>
    <div class="control-group">
      <label>Initial Distance (r): <span id="val-dist">${satelliteDist}</span></label>
      <input type="range" id="slider-dist" class="slider-input" min="10" max="30" value="${satelliteDist}">
    </div>
    <div class="control-group">
      <label>Launch Speed (v): <span id="val-speed">${launchVelocity}</span></label>
      <input type="range" id="slider-speed" class="slider-input" min="2" max="15" step="0.5" value="${launchVelocity}">
    </div>
    <button id="btn-reset-orbit" class="tab-btn active" style="width:100%; margin-top:8px;">Reset Simulation</button>
  `;

  document.getElementById('slider-mass').addEventListener('input', (e) => {
    centralMass = parseFloat(e.target.value);
    document.getElementById('val-mass').textContent = centralMass;
    resetOrbitSimulation();
  });

  document.getElementById('slider-dist').addEventListener('input', (e) => {
    satelliteDist = parseFloat(e.target.value);
    document.getElementById('val-dist').textContent = satelliteDist;
    resetOrbitSimulation();
  });

  document.getElementById('slider-speed').addEventListener('input', (e) => {
    launchVelocity = parseFloat(e.target.value);
    document.getElementById('val-speed').textContent = launchVelocity;
    resetOrbitSimulation();
  });

  document.getElementById('btn-reset-orbit').addEventListener('click', resetOrbitSimulation);
}

function resetOrbitSimulation() {
  satellitePos = new THREE.Vector3(satelliteDist, 0, 0);
  satelliteVel = new THREE.Vector3(0, 0, launchVelocity);
  satellite.position.copy(satellitePos);

  trailPoints = [satellitePos.clone()];
  updateTrailGeometry();
  isOrbitRunning = true;
}

function updateOrbitPhysics() {
  if (!isOrbitRunning) return;

  const dt = 0.02; // Time step
  const r = satellitePos.distanceTo(new THREE.Vector3(0, 0, 0));

  // Collision with central mass
  if (r < 4.0) {
    isOrbitRunning = false;
    metricsContent.innerHTML = `<div class="metric-row"><span style="color:#ef4444; font-weight:bold;">Status: Collided with Central Star!</span></div>`;
    return;
  }

  // Universal Gravitation: a = G * M / r^2 (directed towards center)
  const gAccelMag = (centralMass) / (r * r);
  const accelDir = new THREE.Vector3(0, 0, 0).sub(satellitePos).normalize();
  const accel = accelDir.multiplyScalar(gAccelMag);

  // Velocity Verlet / Euler Integration
  satelliteVel.addScaledVector(accel, dt);
  satellitePos.addScaledVector(satelliteVel, dt);
  satellite.position.copy(satellitePos);

  // Trail line updates
  trailPoints.push(satellitePos.clone());
  if (trailPoints.length > maxTrailPoints) trailPoints.shift();
  updateTrailGeometry();

  // Theoretical circular velocity for comparison: v_circ = sqrt(GM / r)
  const vCirc = Math.sqrt(centralMass / r).toFixed(2);
  const currentSpeed = satelliteVel.length().toFixed(2);

  metricsContent.innerHTML = `
    <div class="metric-row"><span>Distance (r):</span><span class="val">${r.toFixed(2)} AU</span></div>
    <div class="metric-row"><span>Current Speed (v):</span><span class="val">${currentSpeed}</span></div>
    <div class="metric-row"><span>Circular Speed (v_c):</span><span class="val">${vCirc}</span></div>
    <div class="metric-row"><span>Grav Force (F_g):</span><span class="val">${gAccelMag.toFixed(3)}</span></div>
  `;
}

function updateTrailGeometry() {
  if (orbitTrail) {
    orbitTrail.geometry.dispose();
    orbitTrail.geometry = new THREE.BufferGeometry().setFromPoints(trailPoints);
  }
}

function loadPlaceholderModule(name) {
  clearScene();
  controlsPanel.innerHTML = `<h3>${name}</h3><p style="color:#9ca3af; font-size:0.85rem;">Module coming in Step 3!</p>`;
  metricsContent.innerHTML = `<div class="metric-row"><span>Status:</span><span class="val">Ready to code</span></div>`;
}

function animate() {
  requestAnimationFrame(animate);
  if (currentModule === 'orbits') {
    updateOrbitPhysics();
    if (centralBody) centralBody.rotation.y += 0.005;
  }
  controls.update();
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

init();

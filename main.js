let scene, camera, renderer, controls;
let currentModule = 'optics';

// --- OPTICS VARIABLES ---
let glassBlock, incidentRay, refractedRay, normalLine;
let incidentAngleDeg = 30;
let nGlass = 1.52;

// --- ORBIT VARIABLES ---
let centralBody, satellite, orbitTrail;
let trailPoints = [];
const maxTrailPoints = 300;
let centralMass = 1000;
let satelliteDist = 18;
let launchVelocity = 7.5;
let satellitePos, satelliteVel;
let isOrbitRunning = true;

// --- CHEMISTRY VARIABLES ---
let currentMolecule = 'H2O';
const ATOM_COLORS = { H: 0xffffff, O: 0xef4444, C: 0x374151, N: 0x3b82f6 };
const ATOM_RADII = { H: 0.6, O: 1.0, C: 1.1, N: 1.05 };

const MOLECULE_DATA = {
  H2O: {
    name: 'Water',
    formula: 'H₂O',
    type: 'Covalent',
    angle: '104.5°',
    electrons: '8 Valence Pairs',
    atoms: [
      { elem: 'O', pos: [0, 0, 0] },
      { elem: 'H', pos: [2.0, 1.5, 0] },
      { elem: 'H', pos: [-2.0, 1.5, 0] }
    ]
  },
  CO2: {
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    type: 'Double Covalent',
    angle: '180° (Linear)',
    electrons: '16 Valence Electrons',
    atoms: [
      { elem: 'C', pos: [0, 0, 0] },
      { elem: 'O', pos: [-3.2, 0, 0] },
      { elem: 'O', pos: [3.2, 0, 0] }
    ]
  },
  CH4: {
    name: 'Methane',
    formula: 'CH₄',
    type: 'Single Covalent',
    angle: '109.5° (Tetrahedral)',
    electrons: '8 Valence Electrons',
    atoms: [
      { elem: 'C', pos: [0, 0, 0] },
      { elem: 'H', pos: [0, 2.2, 0] },
      { elem: 'H', pos: [2.0, -0.8, 0] },
      { elem: 'H', pos: [-1.7, -0.8, 1.4] },
      { elem: 'H', pos: [-0.3, -0.8, -2.0] }
    ]
  },
  NH3: {
    name: 'Ammonia',
    formula: 'NH₃',
    type: 'Covalent (Trigonal Pyramidal)',
    angle: '107°',
    electrons: '8 Valence Electrons + 1 Lone Pair',
    atoms: [
      { elem: 'N', pos: [0, 0.5, 0] },
      { elem: 'H', pos: [0, -1.2, 1.8] },
      { elem: 'H', pos: [1.6, -1.2, -0.9] },
      { elem: 'H', pos: [-1.6, -1.2, -0.9] }
    ]
  }
};

const container = document.getElementById('canvas-container');
const controlsPanel = document.getElementById('controls-panel');
const metricsContent = document.getElementById('metrics-content');
const diagramSection = document.getElementById('diagram-section');

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
  diagramSection.style.display = 'none';
  
  if (moduleName === 'optics') {
    tabOptics.classList.add('active');
    diagramSection.style.display = 'block';
    loadOpticsModule();
  } else if (moduleName === 'orbits') {
    tabOrbits.classList.add('active');
    loadOrbitsModule();
  } else if (moduleName === 'chem') {
    tabChem.classList.add('active');
    loadChemModule();
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

// --- MODULE 1: OPTICS ---
function loadOpticsModule() {
  clearScene();
  diagramSection.style.display = 'block';

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

  // Update SVG 2D Diagram
  const svgIncX = 100 - Math.sin(radI) * 45;
  const svgIncY = 60 - Math.cos(radI) * 45;
  const svgRefX = 100 + Math.sin(radR) * 45;
  const svgRefY = 60 + Math.cos(radR) * 45;

  document.getElementById('svg-inc-ray').setAttribute('x1', svgIncX);
  document.getElementById('svg-inc-ray').setAttribute('y1', svgIncY);
  document.getElementById('svg-ref-ray').setAttribute('x2', svgRefX);
  document.getElementById('svg-ref-ray').setAttribute('y2', svgRefY);

  metricsContent.innerHTML = `
    <div class="metric-row"><span>Air Index (n1):</span><span class="val">1.00</span></div>
    <div class="metric-row"><span>Medium Index (n2):</span><span class="val">${nGlass}</span></div>
    <div class="metric-row"><span>Angle of Incidence (i):</span><span class="val">${incidentAngleDeg}°</span></div>
    <div class="metric-row"><span>Angle of Refraction (r):</span><span class="val">${refractedAngleDeg}°</span></div>
    <div class="metric-row"><span>Snell Ratio (sin i / sin r):</span><span class="val">${nGlass}</span></div>
  `;
}

// --- MODULE 2: ORBITAL MECHANICS ---
function loadOrbitsModule() {
  clearScene();

  const starGeom = new THREE.SphereGeometry(3.5, 32, 32);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xfba518, emissive: 0xd97706 });
  centralBody = new THREE.Mesh(starGeom, starMat);
  scene.add(centralBody);

  const satGeom = new THREE.SphereGeometry(1.0, 24, 24);
  const satMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2 });
  satellite = new THREE.Mesh(satGeom, satMat);
  scene.add(satellite);

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

  const dt = 0.02;
  const r = satellitePos.distanceTo(new THREE.Vector3(0, 0, 0));

  if (r < 4.0) {
    isOrbitRunning = false;
    metricsContent.innerHTML = `<div class="metric-row"><span style="color:#ef4444; font-weight:bold;">Status: Collided with Central Star!</span></div>`;
    return;
  }

  const gAccelMag = (centralMass) / (r * r);
  const accelDir = new THREE.Vector3(0, 0, 0).sub(satellitePos).normalize();
  const accel = accelDir.multiplyScalar(gAccelMag);

  satelliteVel.addScaledVector(accel, dt);
  satellitePos.addScaledVector(satelliteVel, dt);
  satellite.position.copy(satellitePos);

  trailPoints.push(satellitePos.clone());
  if (trailPoints.length > maxTrailPoints) trailPoints.shift();
  updateTrailGeometry();

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

// --- MODULE 3: CHEMISTRY ---
function loadChemModule() {
  clearScene();
  renderChemUI();
  buildMolecule(currentMolecule);
}

function renderChemUI() {
  controlsPanel.innerHTML = `
    <h3>Chemistry Lab</h3>
    <div class="control-group">
      <label>Select Molecule:</label>
      <select id="select-molecule" style="width:100%; padding:8px; background:#111827; color:#fff; border:1px solid #374151; border-radius:6px;">
        <option value="H2O" ${currentMolecule === 'H2O' ? 'selected' : ''}>Water (H₂O)</option>
        <option value="CO2" ${currentMolecule === 'CO2' ? 'selected' : ''}>Carbon Dioxide (CO₂)</option>
        <option value="CH4" ${currentMolecule === 'CH4' ? 'selected' : ''}>Methane (CH₄)</option>
        <option value="NH3" ${currentMolecule === 'NH3' ? 'selected' : ''}>Ammonia (NH₃)</option>
      </select>
    </div>
  `;

  document.getElementById('select-molecule').addEventListener('change', (e) => {
    currentMolecule = e.target.value;
    buildMolecule(currentMolecule);
  });
}

function buildMolecule(molKey) {
  clearScene();

  const mol = MOLECULE_DATA[molKey];
  const centralPos = new THREE.Vector3(...mol.atoms[0].pos);

  mol.atoms.forEach((atomData, i) => {
    const p = new THREE.Vector3(...atomData.pos);
    const radius = ATOM_RADII[atomData.elem];
    const color = ATOM_COLORS[atomData.elem];

    const geom = new THREE.SphereGeometry(radius, 32, 32);
    const mat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.2 });
    const atomMesh = new THREE.Mesh(geom, mat);
    atomMesh.position.copy(p);
    scene.add(atomMesh);

    if (i > 0) {
      const dist = p.distanceTo(centralPos);
      const bondGeom = new THREE.CylinderGeometry(0.15, 0.15, dist, 16);
      bondGeom.translate(0, dist / 2, 0);
      bondGeom.rotateX(Math.PI / 2);

      const bondMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5 });
      const bondMesh = new THREE.Mesh(bondGeom, bondMat);
      bondMesh.position.copy(centralPos);
      bondMesh.lookAt(p);
      scene.add(bondMesh);
    }
  });

  metricsContent.innerHTML = `
    <div class="metric-row"><span>Molecule Name:</span><span class="val">${mol.name}</span></div>
    <div class="metric-row"><span>Formula:</span><span class="val">${mol.formula}</span></div>
    <div class="metric-row"><span>Bond Type:</span><span class="val">${mol.type}</span></div>
    <div class="metric-row"><span>Bond Angle:</span><span class="val">${mol.angle}</span></div>
    <div class="metric-row"><span>Valence Config:</span><span class="val">${mol.electrons}</span></div>
  `;
}

function animate() {
  requestAnimationFrame(animate);
  if (currentModule === 'orbits') {
    updateOrbitPhysics();
    if (centralBody) centralBody.rotation.y += 0.005;
  } else if (currentModule === 'chem') {
    scene.rotation.y += 0.003;
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

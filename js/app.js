/* ==========================================================================
   TecnoForms - Clasificador de dígitos (TensorFlow.js)
   ========================================================================== */

/* ---------- Configuración ---------- */
const MODEL_URL = 'model/model.json';   // modelo convertido (CNN Keras -> TF.js)
const MODEL_NAME = 'modelo_digitos (Keras CNN)';

/* ---------- Estado global ---------- */
let canvas, ctx;
let miniCanvas, miniCtx;
let isDrawing = false;
let autoPredict = true;
let brushSize = 22;
let audioEnabled = true;
let audioCtx = null;

let tfModel = null;
let isModelLoading = true;

let predictBusy = false;     // evita inferencias solapadas
let predictPending = false;  // hay un dibujo nuevo esperando
let lastBeepDigit = null;

// Plantillas sintéticas para los botones 0-9
const digitPresets = {
  0: [[6,10],[6,18],[10,22],[18,22],[22,18],[22,10],[18,6],[10,6],[6,10]],
  1: [[8,6],[14,6],[14,22],[10,22],[18,22]],
  2: [[6,10],[10,6],[18,6],[22,10],[16,16],[6,22],[22,22]],
  3: [[6,8],[14,6],[20,10],[14,14],[20,18],[14,22],[6,20]],
  4: [[18,22],[18,6],[6,16],[22,16]],
  5: [[20,6],[8,6],[8,13],[18,13],[20,17],[16,22],[8,22]],
  6: [[18,6],[10,6],[6,12],[6,18],[12,22],[18,18],[14,12],[6,12]],
  7: [[6,6],[22,6],[14,14],[14,22]],
  8: [[14,6],[8,9],[14,13],[20,17],[14,22],[8,17],[14,13],[20,9],[14,6]],
  9: [[14,14],[20,10],[16,6],[10,6],[6,10],[10,14],[20,14],[18,22]]
};

/* ==========================================================================
   INICIALIZACIÓN
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  initCanvases();
  initProbabilityMatrix();
  initPresetButtons();
  initTensorFlowModel();
});

function initCanvases() {
  canvas = document.getElementById('digit-canvas');
  ctx = canvas.getContext('2d', { willReadFrequently: true });

  miniCanvas = document.getElementById('mini-canvas');
  miniCtx = miniCanvas.getContext('2d', { willReadFrequently: true });

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  miniCtx.fillStyle = '#000000';
  miniCtx.fillRect(0, 0, 28, 28);

  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseleave', stopDrawing);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
  canvas.addEventListener('touchcancel', stopDrawing);
}

/* ==========================================================================
   AUDIO (Web Audio API)
   ========================================================================== */
function playSynthBeep(freq = 440, type = 'sine', duration = 0.08) {
  if (!audioEnabled) return;
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);

    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn('Audio bloqueado o no soportado:', e);
  }
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const soundBtn = document.getElementById('sound-btn');
  const soundIcon = document.getElementById('sound-icon');

  if (audioEnabled) {
    soundBtn.classList.add('border-cyber-cyan', 'text-cyber-cyan');
    soundIcon.className = 'fa-solid fa-volume-high';
    playSynthBeep(600, 'triangle', 0.1);
  } else {
    soundBtn.classList.remove('border-cyber-cyan', 'text-cyber-cyan');
    soundIcon.className = 'fa-solid fa-volume-xmark text-slate-500';
  }
}

/* ==========================================================================
   DIBUJO EN CANVAS
   ========================================================================== */
function startDrawing(e) {
  isDrawing = true;
  document.getElementById('canvas-hint').classList.add('opacity-0');
  ctx.beginPath();
  const pos = getPos(e);
  ctx.moveTo(pos.x, pos.y);
  playSynthBeep(300, 'sine', 0.04);
}

function draw(e) {
  if (!isDrawing) return;
  const pos = getPos(e);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = brushSize / 4;

  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  if (autoPredict) debouncePredict();
}

function stopDrawing() {
  if (isDrawing) {
    isDrawing = false;
    ctx.closePath();
    ctx.shadowBlur = 0;
    predictDigit(); // predicción final al levantar el lápiz
  }
}

function handleTouchStart(e) {
  e.preventDefault();
  const touch = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
}

function handleTouchMove(e) {
  e.preventDefault();
  const touch = e.touches[0];
  canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY }));
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (canvas.width / rect.width),
    y: (e.clientY - rect.top) * (canvas.height / rect.height)
  };
}

function updateBrushSize(val) {
  brushSize = parseInt(val, 10);
  document.getElementById('brush-size-val').innerText = `${brushSize}px`;
}

function toggleAutoPredict(val) {
  autoPredict = val;
  if (autoPredict) predictDigit();
}

function clearCanvas() {
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  miniCtx.fillStyle = '#000000';
  miniCtx.fillRect(0, 0, 28, 28);

  document.getElementById('canvas-hint').classList.remove('opacity-0');

  document.getElementById('predicted-digit').innerText = '?';
  document.getElementById('digit-status-title').innerText = 'Esperando Trazo...';
  document.getElementById('digit-status-desc').innerText = 'Dibuja un número en el panel izquierdo para calcular las probabilidades neuronales.';
  document.getElementById('confidence-percent').innerText = '0.0%';
  document.getElementById('confidence-bar').style.width = '0%';
  document.getElementById('center-mass-val').innerText = 'X: 14.0 | Y: 14.0';

  lastBeepDigit = null;
  resetProbabilities();
  playSynthBeep(250, 'sawtooth', 0.12);
}

/* Botones de ejemplo sintético */
function initPresetButtons() {
  const container = document.getElementById('preset-buttons');
  container.innerHTML = '';
  for (let num = 0; num <= 9; num++) {
    const btn = document.createElement('button');
    btn.className = 'w-6 h-6 rounded bg-slate-900 border border-slate-700 hover:border-cyber-cyan hover:text-cyber-cyan text-xs font-mono font-bold transition-all flex items-center justify-center';
    btn.innerText = num;
    btn.onclick = () => drawPresetDigit(num);
    container.appendChild(btn);
  }
}

function drawPresetDigit(num) {
  clearCanvas();
  document.getElementById('canvas-hint').classList.add('opacity-0');
  const points = digitPresets[num];
  if (!points) return;

  const scale = canvas.width / 28;
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = brushSize;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();

  points.forEach((pt, i) => {
    const x = pt[0] * scale;
    const y = pt[1] * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();
  ctx.closePath();
  playSynthBeep(500, 'sine', 0.08);
  predictDigit();
}

/* ==========================================================================
   PREPROCESAMIENTO ESTILO MNIST
   1) recortar el trazo (bounding box)
   2) escalar a 20x20 conservando proporción
   3) centrar en 28x28 por centro de masa
   Devuelve Float32Array(784) en [0,1], o null si el canvas está vacío.
   ========================================================================== */
function getPreprocessedTensor() {
  const W = canvas.width, H = canvas.height;
  const data = ctx.getImageData(0, 0, W, H).data;

  // Bounding box del trazo
  let minX = W, minY = H, maxX = -1, maxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (data[(y * W + x) * 4] > 20) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    miniCtx.fillStyle = '#000000';
    miniCtx.fillRect(0, 0, 28, 28);
    return null;
  }

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;

  // Escalar el recorte para que el lado mayor mida 20 px
  let tw = 20, th = 20;
  if (bw > bh) th = Math.max(1, Math.round((bh / bw) * 20));
  else         tw = Math.max(1, Math.round((bw / bh) * 20));

  const tmp = document.createElement('canvas');
  tmp.width = 28; tmp.height = 28;
  const tctx = tmp.getContext('2d', { willReadFrequently: true });
  tctx.fillStyle = '#000000';
  tctx.fillRect(0, 0, 28, 28);
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(canvas, minX, minY, bw, bh,
                 Math.round(14 - tw / 2), Math.round(14 - th / 2), tw, th);

  const px = tctx.getImageData(0, 0, 28, 28).data;
  const gray = new Float32Array(784);
  for (let i = 0; i < 784; i++) gray[i] = px[i * 4] / 255;

  // Centro de masa en la imagen de 28x28
  let mass = 0, sx = 0, sy = 0;
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const v = gray[y * 28 + x];
      mass += v; sx += x * v; sy += y * v;
    }
  }
  const cx = sx / mass, cy = sy / mass;
  document.getElementById('center-mass-val').innerText = `X: ${cx.toFixed(1)} | Y: ${cy.toFixed(1)}`;

  // Desplazar para que el centro de masa quede en (14, 14), como en MNIST
  const dx = Math.round(14 - cx);
  const dy = Math.round(14 - cy);
  const out = new Float32Array(784);
  for (let y = 0; y < 28; y++) {
    for (let x = 0; x < 28; x++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && nx < 28 && ny >= 0 && ny < 28) out[ny * 28 + nx] = gray[y * 28 + x];
    }
  }

  // Mostrar lo que realmente ve el modelo
  const img = miniCtx.createImageData(28, 28);
  for (let i = 0; i < 784; i++) {
    const v = Math.round(out[i] * 255);
    img.data[i * 4] = v; img.data[i * 4 + 1] = v; img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  miniCtx.putImageData(img, 0, 0);

  return out;
}

/* ==========================================================================
   CARGA DEL MODELO TF.js
   ========================================================================== */
function setBadge(state, text) {
  const badge = document.getElementById('tf-status-badge');
  document.getElementById('tf-status-text').innerText = text;
  const base = 'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono transition-all duration-300 ';
  const styles = {
    loading: 'bg-slate-900/90 border border-amber-500/40 text-amber-400',
    ready:   'bg-cyber-green/10 border border-cyber-green/40 text-cyber-green shadow-lg shadow-cyber-green/10',
    error:   'bg-red-500/10 border border-red-500/50 text-red-400'
  };
  badge.className = base + styles[state];
  badge.firstElementChild.className = 'w-2 h-2 rounded-full ' +
    (state === 'loading' ? 'bg-amber-400 animate-ping' : state === 'ready' ? 'bg-cyber-green' : 'bg-red-400');
}

function warmUpModel() {
  tf.tidy(() => { tfModel.predict(tf.zeros([1, 28, 28, 1])); });
}

async function initTensorFlowModel() {
  if (typeof tf === 'undefined') {
    isModelLoading = false;
    setBadge('error', 'TensorFlow.js no cargó (¿sin internet?)');
    return;
  }

  try {
    setBadge('loading', 'Cargando modelo...');
    if (typeof MODEL_DATA !== 'undefined') {
      // Modelo incrustado en js/model-data.js: funciona abriendo index.html directo (file://)
      const bin = atob(MODEL_DATA.weightsB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      tfModel = await tf.loadLayersModel(tf.io.fromMemory({
        modelTopology: MODEL_DATA.modelTopology,
        weightSpecs: MODEL_DATA.weightSpecs,
        weightData: bytes.buffer
      }));
    } else {
      tfModel = await tf.loadLayersModel(MODEL_URL);
    }
    warmUpModel();

    document.getElementById('active-model-name').innerText = MODEL_NAME;
    setBadge('ready', `Modelo listo (${tf.getBackend()})`);
  } catch (err) {
    console.error('No se pudo cargar', MODEL_URL, err);
    tfModel = null;
    setBadge('error', 'Modelo no encontrado');
    document.getElementById('digit-status-title').innerText = 'Modelo no cargado';
    document.getElementById('digit-status-desc').innerText =
      'Abre la página con un servidor local (http://localhost) o carga model.json y .bin con el botón de arriba.';
  } finally {
    isModelLoading = false;
  }
}

/* ==========================================================================
   INFERENCIA
   ========================================================================== */
let debounceTimer = null;
function debouncePredict() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(predictDigit, 60);
}

async function predictDigit() {
  if (isModelLoading || !tfModel) return;

  if (predictBusy) { predictPending = true; return; }
  predictBusy = true;

  try {
    const pixels = getPreprocessedTensor();
    if (!pixels) return;

    const t0 = performance.now();
    const input = tf.tensor4d(pixels, [1, 28, 28, 1]);
    const output = tfModel.predict(input);
    const probabilities = Array.from(await output.data());
    input.dispose();
    output.dispose();

    document.getElementById('inference-time').innerText = `${(performance.now() - t0).toFixed(1)} ms`;

    let winningDigit = 0, maxProb = -1;
    probabilities.forEach((p, d) => { if (p > maxProb) { maxProb = p; winningDigit = d; } });

    updatePredictionDisplay(winningDigit, maxProb, probabilities);
  } catch (e) {
    console.error('Error en la inferencia:', e);
  } finally {
    predictBusy = false;
    if (predictPending) { predictPending = false; predictDigit(); }
  }
}

/* ==========================================================================
   UI: PROBABILIDADES
   ========================================================================== */
function initProbabilityMatrix() {
  const container = document.getElementById('probability-matrix');
  container.innerHTML = '';

  for (let i = 0; i <= 9; i++) {
    const row = document.createElement('div');
    row.className = 'flex items-center gap-3 text-xs font-mono';
    row.id = `prob-row-${i}`;
    row.innerHTML = `
      <span class="w-5 font-orbitron font-bold text-center text-slate-400 text-sm" id="digit-label-${i}">${i}</span>
      <div class="flex-1 bg-slate-900/90 border border-slate-800 rounded-full h-3 overflow-hidden p-[1px] relative">
        <div id="prob-bar-${i}" class="prob-bar-fill h-full rounded-full bg-slate-700 w-0"></div>
      </div>
      <span class="w-12 text-right font-bold text-slate-500" id="prob-val-${i}">0.0%</span>
    `;
    container.appendChild(row);
  }
}

function updatePredictionDisplay(winningDigit, confidence, probabilities) {
  const digitEl = document.getElementById('predicted-digit');
  const titleEl = document.getElementById('digit-status-title');
  const descEl = document.getElementById('digit-status-desc');
  const confValEl = document.getElementById('confidence-percent');
  const confBarEl = document.getElementById('confidence-bar');
  const ringEl = document.getElementById('digit-glow-ring');

  digitEl.innerText = winningDigit;
  const confPercent = (confidence * 100).toFixed(1);
  confValEl.innerText = `${confPercent}%`;
  confBarEl.style.width = `${confPercent}%`;

  titleEl.innerText = `Dígito Detectado: [ ${winningDigit} ]`;
  descEl.innerText = confidence < 0.5
    ? 'Confianza baja: intenta dibujar el número más grande y claro.'
    : 'Reconocimiento completado por el modelo convolucional TecnoForms.';

  if (confidence > 0.7) {
    ringEl.className = 'w-32 h-32 rounded-2xl bg-slate-900/90 border-2 border-cyber-green neon-border-green flex items-center justify-center shadow-2xl transition-all duration-300';
    digitEl.className = 'font-orbitron font-black text-7xl text-cyber-green neon-text-green transition-all duration-200';
    if (lastBeepDigit !== winningDigit) playSynthBeep(880, 'sine', 0.05);
  } else {
    ringEl.className = 'w-32 h-32 rounded-2xl bg-slate-900/90 border-2 border-cyber-cyan neon-border-cyan flex items-center justify-center shadow-2xl transition-all duration-300';
    digitEl.className = 'font-orbitron font-black text-7xl text-cyber-cyan neon-text-cyan transition-all duration-200';
  }
  lastBeepDigit = winningDigit;

  probabilities.forEach((prob, i) => {
    const bar = document.getElementById(`prob-bar-${i}`);
    const valText = document.getElementById(`prob-val-${i}`);
    const label = document.getElementById(`digit-label-${i}`);
    const pct = (prob * 100).toFixed(1);

    bar.style.width = `${pct}%`;
    valText.innerText = `${pct}%`;

    if (i === winningDigit) {
      bar.className = 'prob-bar-fill h-full rounded-full bg-gradient-to-r from-cyber-cyan to-cyber-green shadow-lg shadow-cyber-green/30';
      valText.className = 'w-12 text-right font-bold text-cyber-green neon-text-green';
      label.className = 'w-5 font-orbitron font-bold text-center text-cyber-green text-base scale-110';
    } else if (prob > 0.15) {
      bar.className = 'prob-bar-fill h-full rounded-full bg-cyber-cyan/60';
      valText.className = 'w-12 text-right font-semibold text-cyber-cyan';
      label.className = 'w-5 font-orbitron font-bold text-center text-cyber-cyan text-sm';
    } else {
      bar.className = 'prob-bar-fill h-full rounded-full bg-slate-800';
      valText.className = 'w-12 text-right font-normal text-slate-600';
      label.className = 'w-5 font-orbitron font-bold text-center text-slate-500 text-sm';
    }
  });
}

function resetProbabilities() {
  for (let i = 0; i <= 9; i++) {
    const bar = document.getElementById(`prob-bar-${i}`);
    const valText = document.getElementById(`prob-val-${i}`);
    const label = document.getElementById(`digit-label-${i}`);
    if (bar) bar.style.width = '0%';
    if (valText) {
      valText.innerText = '0.0%';
      valText.className = 'w-12 text-right font-normal text-slate-600';
    }
    if (label) label.className = 'w-5 font-orbitron font-bold text-center text-slate-500 text-sm';
  }
}

/* ==========================================================================
   MODAL + CARGA MANUAL DE MODELO
   ========================================================================== */
function toggleModal(id) {
  const modal = document.getElementById(id);
  if (modal.classList.contains('hidden')) {
    modal.classList.remove('hidden');
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
  } else {
    modal.classList.add('opacity-0');
    setTimeout(() => modal.classList.add('hidden'), 300);
  }
}

async function loadUserUploadedModel() {
  const jsonInput = document.getElementById('json-file-input');
  const weightsInput = document.getElementById('weights-file-input');

  if (!jsonInput.files.length || !weightsInput.files.length) {
    alert('Selecciona el archivo model.json y los archivos de pesos .bin');
    return;
  }

  try {
    const jsonFile = jsonInput.files[0];
    const weightsFiles = Array.from(weightsInput.files);

    const customModel = await tf.loadLayersModel(tf.io.browserFiles([jsonFile, ...weightsFiles]));
    if (tfModel) tfModel.dispose();
    tfModel = customModel;
    warmUpModel();

    document.getElementById('active-model-name').innerText = `Keras Exportado (${jsonFile.name})`;
    setBadge('ready', `Modelo listo (${tf.getBackend()})`);
    isModelLoading = false;

    playSynthBeep(1000, 'sine', 0.2);
    toggleModal('model-modal');
    predictDigit();
  } catch (err) {
    console.error('Error cargando el modelo del usuario:', err);
    alert('Error al cargar el modelo. Verifica que fue exportado con tensorflowjs_converter.');
  }
}

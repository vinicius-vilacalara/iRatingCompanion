/* ══════════════════════════════════════════════
   iRACING TRACKER — Frontend Logic
══════════════════════════════════════════════ */

// ─── State ───────────────────────────────────
let sessions = [];
let settings = { current_irating: '1500', current_safety: '3.00' };
let chart = null;
let currentChartMode = 'irating';
let editingField = null;

// ─── Init ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  setupNav();
  setupForm();
  setupModal();
  await loadAll();
});

// ─── Navigation ───────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${page}`).classList.add('active');
    });
  });
}

// ─── Load all data ────────────────────────────
async function loadAll() {
  await Promise.all([loadSettings(), loadSessions()]);
  updateDashboard();
}

async function loadSettings() {
  const res = await fetch('/api/settings');
  settings = await res.json();
}

async function loadSessions() {
  const res = await fetch('/api/sessions');
  sessions = await res.json();
}

// ─── Dashboard ────────────────────────────────
function updateDashboard() {
  const irating = parseInt(settings.current_irating) || 0;
  const safety = parseFloat(settings.current_safety) || 0;

  document.getElementById('stat-irating').textContent = irating.toLocaleString();
  document.getElementById('stat-safety').textContent = safety.toFixed(2);
  document.getElementById('stat-sessions').textContent = sessions.length;

  // Deltas from last session
  if (sessions.length > 0) {
    const last = sessions[0];
    const irD = last.irating_gain;
    const saD = last.safety_gain;

    const irEl = document.getElementById('stat-irating-delta');
    irEl.textContent = `Last: ${irD >= 0 ? '+' : ''}${irD}`;
    irEl.className = 'stat-delta ' + (irD >= 0 ? 'delta-pos' : 'delta-neg');

    const saEl = document.getElementById('stat-safety-delta');
    saEl.textContent = `Last: ${saD >= 0 ? '+' : ''}${saD.toFixed(2)}`;
    saEl.className = 'stat-delta ' + (saD >= 0 ? 'delta-pos' : 'delta-neg');
  }

  // Win rate / avg finish
  if (sessions.length > 0) {
    const finished = sessions.filter(s => s.final_position !== null);
    if (finished.length > 0) {
      const avg = finished.reduce((a, s) => a + s.final_position, 0) / finished.length;
      document.getElementById('stat-winrate').textContent = `Avg finish: P${avg.toFixed(1)}`;
    }
  }

  renderTable();
  renderChart(currentChartMode);
  updatePreview();
}

// ─── Session Table ────────────────────────────
function renderTable() {
  const tbody = document.getElementById('session-tbody');
  if (sessions.length === 0) {
    tbody.innerHTML = '<tr class="empty-row"><td colspan="10">No sessions logged yet</td></tr>';
    return;
  }

  tbody.innerHTML = sessions.map(s => {
    const date = new Date(s.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
    const irClass = s.irating_gain >= 0 ? 'cell-gain-pos' : 'cell-gain-neg';
    const saClass = s.safety_gain >= 0 ? 'cell-gain-pos' : 'cell-gain-neg';
    const irSign = s.irating_gain >= 0 ? '+' : '';
    const saSign = s.safety_gain >= 0 ? '+' : '';

    return `
      <tr>
        <td>${date}</td>
        <td>${s.track || '—'}</td>
        <td>${s.car || '—'}</td>
        <td class="cell-pos">${s.start_position ? 'P' + s.start_position : '—'}</td>
        <td class="cell-pos">${s.final_position ? 'P' + s.final_position : '—'}</td>
        <td class="${irClass}">${irSign}${s.irating_gain}</td>
        <td class="${saClass}">${saSign}${parseFloat(s.safety_gain).toFixed(2)}</td>
        <td class="cell-rating">${s.irating_after?.toLocaleString() || '—'}</td>
        <td class="cell-safety">${parseFloat(s.safety_after || 0).toFixed(2)}</td>
        <td><button class="del-btn" onclick="deleteSession(${s.id})" title="Delete">✕</button></td>
      </tr>
    `;
  }).join('');
}

// ─── Chart ────────────────────────────────────
function renderChart(mode) {
  currentChartMode = mode;
  document.querySelectorAll('.chart-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.chart === mode);
  });

  const sorted = [...sessions].reverse(); // oldest first
  const labels = sorted.map((s, i) => {
    const d = new Date(s.date);
    return `#${i + 1} ${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`;
  });

  const emptyEl = document.getElementById('chart-empty');
  const canvas = document.getElementById('progressChart');

  if (sessions.length < 2) {
    emptyEl.classList.add('visible');
    canvas.style.display = 'none';
    if (chart) { chart.destroy(); chart = null; }
    return;
  }
  emptyEl.classList.remove('visible');
  canvas.style.display = 'block';

  const iRatingData = sorted.map(s => s.irating_after);
  const safetyData = sorted.map(s => parseFloat(s.safety_after));

  const datasets = [];
  const useIRating = mode === 'irating' || mode === 'both';
  const useSafety = mode === 'safety' || mode === 'both';

  if (useIRating) {
    datasets.push({
      label: 'iRating',
      data: iRatingData,
      borderColor: '#ffc800',
      backgroundColor: 'rgba(255,200,0,0.08)',
      pointBackgroundColor: '#ffc800',
      pointBorderColor: '#000',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: mode === 'irating',
      yAxisID: 'y',
    });
  }
  if (useSafety) {
    datasets.push({
      label: 'Safety Rating',
      data: safetyData,
      borderColor: '#00d4ff',
      backgroundColor: 'rgba(0,212,255,0.08)',
      pointBackgroundColor: '#00d4ff',
      pointBorderColor: '#000',
      pointRadius: 4,
      pointHoverRadius: 6,
      tension: 0.35,
      fill: mode === 'safety',
      yAxisID: mode === 'both' ? 'y2' : 'y',
    });
  }

  const yAxes = {
    y: {
      display: useIRating,
      position: 'left',
      grid: { color: 'rgba(255,255,255,0.04)' },
      ticks: { color: '#5a6478', font: { family: 'Space Mono', size: 10 } },
    }
  };
  if (mode === 'both') {
    yAxes.y2 = {
      display: true, position: 'right',
      grid: { drawOnChartArea: false },
      ticks: { color: '#00d4ff', font: { family: 'Space Mono', size: 10 } },
    };
  }

  const config = {
    type: 'line',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      animation: { duration: 400 },
      plugins: {
        legend: {
          display: mode === 'both',
          labels: { color: '#8896aa', font: { family: 'Rajdhani', size: 12 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: '#111820',
          borderColor: 'rgba(255,200,0,0.3)',
          borderWidth: 1,
          titleColor: '#ffc800',
          bodyColor: '#8896aa',
          titleFont: { family: 'Space Mono', size: 11 },
          bodyFont: { family: 'Space Mono', size: 11 },
          padding: 10,
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: { color: '#5a6478', font: { family: 'Space Mono', size: 9 }, maxTicksLimit: 10 },
        },
        ...yAxes
      }
    }
  };

  if (chart) { chart.destroy(); }
  chart = new Chart(canvas, config);
}

document.querySelectorAll('.chart-tab').forEach(tab => {
  tab.addEventListener('click', () => renderChart(tab.dataset.chart));
});

// ─── Log Form ────────────────────────────────
function setupForm() {
  const irInput = document.getElementById('irating-gain');
  const saInput = document.getElementById('safety-gain');

  [irInput, saInput].forEach(el => el.addEventListener('input', updatePreview));

  document.getElementById('submit-btn').addEventListener('click', submitSession);
  document.getElementById('clear-btn').addEventListener('click', clearForm);
}

function updatePreview() {
  const irGain = parseInt(document.getElementById('irating-gain').value) || 0;
  const saGain = parseFloat(document.getElementById('safety-gain').value) || 0;
  const preview = document.getElementById('log-preview');

  if (irGain !== 0 || saGain !== 0) {
    const newIr = (parseInt(settings.current_irating) || 0) + irGain;
    const newSa = Math.max(0, parseFloat(settings.current_safety || 0) + saGain);
    document.getElementById('preview-irating').textContent = newIr.toLocaleString();
    document.getElementById('preview-safety').textContent = newSa.toFixed(2);
    preview.style.display = 'flex';
  } else {
    preview.style.display = 'none';
  }
}

async function submitSession() {
  const irating_gain = document.getElementById('irating-gain').value;
  const safety_gain = document.getElementById('safety-gain').value;

  if (!irating_gain || !safety_gain) {
    showToast('iRating and Safety Rating gains are required', true);
    return;
  }

  const body = {
    irating_gain: parseInt(irating_gain),
    safety_gain: parseFloat(safety_gain),
    start_position: document.getElementById('start-pos').value || null,
    final_position: document.getElementById('final-pos').value || null,
    car: document.getElementById('car-input').value.trim() || null,
    track: document.getElementById('track-input').value.trim() || null,
    obs: document.getElementById('obs-input').value.trim() || null,
  };

  const res = await fetch('/api/sessions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json();

  showToast(`Session logged! iRating: ${data.irating_after.toLocaleString()} | Safety: ${parseFloat(data.safety_after).toFixed(2)}`);
  clearForm();
  await loadAll();

  // Switch to dashboard
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-page="dashboard"]').classList.add('active');
  document.getElementById('page-dashboard').classList.add('active');
}

function clearForm() {
  ['irating-gain','safety-gain','start-pos','final-pos','car-input','track-input','obs-input']
    .forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('log-preview').style.display = 'none';
}

// ─── Delete Session ───────────────────────────
async function deleteSession(id) {
  if (!confirm('Delete this session?')) return;
  await fetch(`/api/sessions/${id}`, { method: 'DELETE' });
  await loadAll();
}

// ─── Edit Modal (current ratings) ────────────
function setupModal() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.field));
  });
  document.getElementById('modal-cancel').addEventListener('click', closeModal);
  document.getElementById('modal-save').addEventListener('click', saveModal);
  document.getElementById('modal-overlay').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
}

function openModal(field) {
  editingField = field;
  const isIrating = field === 'irating';
  document.getElementById('modal-title').textContent = isIrating ? 'Set Current iRating' : 'Set Current Safety Rating';
  document.getElementById('modal-input').value = isIrating
    ? settings.current_irating : settings.current_safety;
  document.getElementById('modal-input').step = isIrating ? '1' : '0.01';
  document.getElementById('modal-overlay').classList.add('open');
  document.getElementById('modal-input').focus();
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('open');
  editingField = null;
}

async function saveModal() {
  const val = document.getElementById('modal-input').value;
  if (!val) return;

  const body = editingField === 'irating'
    ? { current_irating: parseInt(val) }
    : { current_safety: parseFloat(val) };

  await fetch('/api/settings', {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  closeModal();
  await loadAll();
  showToast('Rating updated!');
}

// ─── Toast ────────────────────────────────────
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (isError ? ' error' : '');
  void t.offsetWidth;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3500);
}

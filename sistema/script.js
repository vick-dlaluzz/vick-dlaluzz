/* ==============================================
   FASTWASH SISTEMA INTERNO – script.js
   Full app logic: auth, orders, search, QR, reports
   ============================================== */

// ============================================
//  DEMO USERS
// ============================================
const USERS = [
  { username: 'admin',    password: '1234', role: 'admin',    name: 'Administrador' },
  { username: 'empleado', password: '1234', role: 'empleado', name: 'Empleado' },
];

// ============================================
//  STATE
// ============================================
let currentUser  = null;
let orders       = loadOrders();
let cuts         = loadCuts();
let activeFilter = 'all';
let qrScanner    = null;

// ============================================
//  UTILS
// ============================================
function genId() {
  return 'FW-' + Date.now().toString(36).toUpperCase().slice(-5);
}
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })
       + ' ' + d.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' });
}
function fmtDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day:'2-digit', month:'short' });
}
function isOverdue(iso) {
  return iso && new Date(iso) < new Date();
}

function loadOrders() {
  try { return JSON.parse(localStorage.getItem('fw_orders') || '[]'); } catch { return []; }
}
function saveOrders() {
  localStorage.setItem('fw_orders', JSON.stringify(orders));
}
function loadCuts() {
  try { return JSON.parse(localStorage.getItem('fw_cuts') || '[]'); } catch { return []; }
}
function saveCuts() {
  localStorage.setItem('fw_cuts', JSON.stringify(cuts));
}

// ============================================
//  AUTH
// ============================================
const loginScreen = document.getElementById('login-screen');
const appMain   = document.getElementById('app-main');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value;
  const found = USERS.find(u => u.username === user && u.password === pass);
  if (found) {
    currentUser = found;
    loginScreen.style.display = 'none';
    appMain.style.display = 'block';
    initApp();
  } else {
    loginError.textContent = 'Usuario o contraseña incorrectos.';
    setTimeout(() => { loginError.textContent = ''; }, 3000);
  }
});

document.getElementById('logout-btn').addEventListener('click', () => {
  currentUser = null;
  loginScreen.style.display = 'flex';
  appMain.style.display = 'none';
  loginForm.reset();
});

// ============================================
//  INIT APP AFTER LOGIN
// ============================================
function initApp() {
  // Update header user info
  document.getElementById('user-name-display').textContent = currentUser.name;
  const roleLabel = document.getElementById('user-role-label');
  roleLabel.textContent = currentUser.role === 'admin' ? 'Admin' : 'Empleado';
  if (currentUser.role === 'admin') {
    roleLabel.classList.add('admin');
    document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  }

  // Setup tabs
  setupTabs();

  // Setup nueva orden form
  setupOrderForm();

  // Render orders
  renderOrders();
  updateSummary();

  // Setup search & filters
  setupSearch();

  // Setup QR scanner
  setupQR();

  // Setup monitoreo (admin only)
  if (currentUser.role === 'admin') {
    setupMonitoreo();
  }

  // Setup order detail modal close
  document.getElementById('modal-overlay').addEventListener('click', closeOrderModal);
  document.getElementById('modal-close').addEventListener('click', closeOrderModal);
}

// ============================================
//  TABS
// ============================================
function setupTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-panel-' + target).classList.add('active');

      if (target === 'pedidos') renderOrders();
      if (target === 'monitoreo') refreshMonitoreo();
    });
  });
}

// ============================================
//  NUEVA ORDEN FORM
// ============================================
function setupOrderForm() {
  const form = document.getElementById('order-form');

  // Pre-fill datetime to now + 8 hours
  const fechaInput = document.getElementById('f-fecha');
  const def = new Date(Date.now() + 8 * 60 * 60 * 1000);
  fechaInput.value = def.toISOString().slice(0, 16);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const order = {
      id:           genId(),
      nombre:       data.nombre,
      telefono:     data.telefono,
      servicio:     data.servicio,
      peso:         data.peso || null,
      fecha:        data.fecha,
      sucursal:     data.sucursal,
      instrucciones:data.instrucciones || '',
      pago:         data.pago,
      status:       'pendiente',
      creado:       new Date().toISOString(),
      creadoPor:    currentUser.name,
    };
    orders.unshift(order);
    saveOrders();
    showTicket(order);
    form.reset();
    // Reset datetime
    fechaInput.value = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);
  });
}

// ============================================
//  TICKET
// ============================================
function showTicket(order) {
  const modal = document.getElementById('ticket-modal');
  const body  = document.getElementById('ticket-body');
  const qrDiv = document.getElementById('ticket-qr');

  const servicioLabel = {
    kilo: 'Lavado por kilo',
    express: 'Servicio Express',
    domicilio: 'A domicilio',
  }[order.servicio] || order.servicio;

  body.innerHTML = `
    <div class="ticket-row"><span>Folio</span><span>${order.id}</span></div>
    <div class="ticket-row"><span>Cliente</span><span>${order.nombre}</span></div>
    <div class="ticket-row"><span>Teléfono</span><span>${order.telefono}</span></div>
    <div class="ticket-row"><span>Servicio</span><span>${servicioLabel}</span></div>
    ${order.peso ? `<div class="ticket-row"><span>Peso</span><span>${order.peso} kg</span></div>` : ''}
    <div class="ticket-row"><span>Entrega</span><span>${fmtDate(order.fecha)}</span></div>
    <div class="ticket-row"><span>Sucursal</span><span>${order.sucursal}</span></div>
    <div class="ticket-row"><span>Pago</span><span>${order.pago}</span></div>
    ${order.instrucciones ? `<div class="ticket-row"><span>Notas</span><span>${order.instrucciones}</span></div>` : ''}
  `;

  // Generate QR code (simple text fallback using canvas)
  qrDiv.innerHTML = '';
  generateQRFallback(qrDiv, order.id);

  modal.style.display = 'flex';

  document.getElementById('ticket-overlay').onclick = closeTicket;
  document.getElementById('ticket-close').onclick = closeTicket;
  document.getElementById('ticket-print').onclick = () => window.print();
}

function closeTicket() {
  document.getElementById('ticket-modal').style.display = 'none';
}

// Simple QR-like visual fallback (actual QR via html5-qrcode isn't for generation)
function generateQRFallback(container, text) {
  // Use a QR code API for display
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(text)}`;
  img.alt = 'QR ' + text;
  img.width = 150;
  img.height = 150;
  img.style.margin = '0 auto';
  img.style.borderRadius = '8px';
  container.appendChild(img);

  const label = document.createElement('p');
  label.textContent = text;
  label.style.cssText = 'text-align:center;font-family:monospace;font-size:.85rem;margin-top:6px;color:#64748b;font-weight:700;';
  container.appendChild(label);
}

// ============================================
//  ORDERS GRID
// ============================================
const SERVICE_LABELS = {
  kilo:      '⚖️ Lavado por kilo',
  express:   '⚡ Servicio Express',
  domicilio: '🚚 A domicilio',
};

function filteredOrders() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  return orders.filter(o => {
    const matchFilter = activeFilter === 'all' || o.status === activeFilter;
    const matchSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      o.nombre.toLowerCase().includes(q) ||
      o.telefono.includes(q) ||
      o.status.includes(q);
    return matchFilter && matchSearch;
  });
}

function renderOrders() {
  const grid  = document.getElementById('orders-grid');
  const empty = document.getElementById('empty-state');
  const list  = filteredOrders();

  if (list.length === 0) {
    grid.innerHTML = '';
    empty.style.display = 'block';
    updateSummary();
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = list.map(o => {
    const overdue = o.status !== 'entregado' && isOverdue(o.fecha);
    return `
    <div class="order-card ${o.status}" data-id="${o.id}">
      <div class="order-card-header">
        <div>
          <div class="order-id">${o.id}</div>
          <div class="order-client-name">${o.nombre}</div>
          <div class="order-service">${SERVICE_LABELS[o.servicio] || o.servicio}</div>
        </div>
        <span class="status-badge status-${o.status}">${statusLabel(o.status)}</span>
      </div>
      <div class="order-card-footer">
        <span class="order-date${overdue ? ' overdue' : ''}">
          🗓 ${fmtDate(o.fecha)}${overdue ? ' ⚠️' : ''}
        </span>
        <span style="font-size:.78rem;color:var(--neutral-400)">${o.sucursal}</span>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.order-card').forEach(card => {
    card.addEventListener('click', () => openOrderModal(card.dataset.id));
  });

  updateSummary();
}

function statusLabel(s) {
  return { pendiente:'Pendiente', proceso:'En proceso', listo:'Listo', entregado:'Entregado' }[s] || s;
}

function updateSummary() {
  document.getElementById('count-total').textContent   = orders.length;
  document.getElementById('count-pending').textContent = orders.filter(o => o.status === 'pendiente').length;
  document.getElementById('count-process').textContent = orders.filter(o => o.status === 'proceso').length;
  document.getElementById('count-ready').textContent   = orders.filter(o => o.status === 'listo').length;
}

// ============================================
//  SEARCH & FILTERS
// ============================================
function setupSearch() {
  document.getElementById('search-input').addEventListener('input', renderOrders);

  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFilter = chip.dataset.filter;
      renderOrders();
    });
  });
}

// ============================================
//  QR SCANNER
// ============================================
function setupQR() {
  const btn   = document.getElementById('qr-scan-btn');
  const panel = document.getElementById('qr-panel');
  const closeBtn = document.getElementById('qr-close-btn');

  btn.addEventListener('click', () => {
    panel.style.display = 'block';
    startQR();
  });
  closeBtn.addEventListener('click', stopQR);
}

function startQR() {
  if (!window.Html5Qrcode) return;
  qrScanner = new Html5Qrcode('qr-reader');
  qrScanner.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: { width: 220, height: 220 } },
    (decoded) => {
      stopQR();
      document.getElementById('search-input').value = decoded;
      renderOrders();
    },
    () => {}
  ).catch(err => {
    console.warn('QR start failed:', err);
  });
}

function stopQR() {
  document.getElementById('qr-panel').style.display = 'none';
  if (qrScanner) {
    qrScanner.stop().catch(() => {});
    qrScanner = null;
  }
}

// ============================================
//  ORDER DETAIL MODAL
// ============================================
function openOrderModal(id) {
  const order = orders.find(o => o.id === id);
  if (!order) return;

  const servicioLabel = SERVICE_LABELS[order.servicio] || order.servicio;
  const modal = document.getElementById('order-detail-modal');
  document.getElementById('modal-title').textContent = 'Orden ' + order.id;

  document.getElementById('modal-body').innerHTML = `
    <div class="detail-row"><span class="detail-label">Cliente</span><span class="detail-value">${order.nombre}</span></div>
    <div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${order.telefono}</span></div>
    <div class="detail-row"><span class="detail-label">Servicio</span><span class="detail-value">${servicioLabel}</span></div>
    ${order.peso ? `<div class="detail-row"><span class="detail-label">Peso</span><span class="detail-value">${order.peso} kg</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Entrega prometida</span><span class="detail-value">${fmtDate(order.fecha)}</span></div>
    <div class="detail-row"><span class="detail-label">Sucursal</span><span class="detail-value">${order.sucursal}</span></div>
    <div class="detail-row"><span class="detail-label">Método de pago</span><span class="detail-value">${order.pago}</span></div>
    ${order.instrucciones ? `<div class="detail-row"><span class="detail-label">Instrucciones</span><span class="detail-value">${order.instrucciones}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Registrado</span><span class="detail-value">${fmtDate(order.creado)}</span></div>
    <div class="detail-row"><span class="detail-label">Por</span><span class="detail-value">${order.creadoPor}</span></div>
    <div style="margin-top:16px;text-align:center">${generateQRHTML(order.id)}</div>
  `;

  const sel = document.getElementById('modal-status-select');
  sel.value = order.status;

  const saveBtn = document.getElementById('modal-save-status');
  saveBtn.onclick = () => {
    order.status = sel.value;
    order.ultimoCambio = new Date().toISOString();
    order.cambiadoPor = currentUser.name;
    saveOrders();
    closeOrderModal();
    renderOrders();
    if (currentUser.role === 'admin') refreshMonitoreo();
  };

  modal.style.display = 'flex';
}

function generateQRHTML(id) {
  return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(id)}" 
    alt="QR ${id}" style="margin:0 auto;border-radius:8px;" />
    <p style="font-family:monospace;font-size:.8rem;color:#64748b;margin-top:4px;text-align:center;">${id}</p>`;
}

function closeOrderModal() {
  document.getElementById('order-detail-modal').style.display = 'none';
}

// ============================================
//  MONITOREO (ADMIN)
// ============================================
function setupMonitoreo() {
  // Corte de caja
  const efectivo   = document.getElementById('corte-efectivo');
  const transferencia = document.getElementById('corte-transferencia');
  const totalDisplay  = document.getElementById('corte-total-display');

  function updateTotal() {
    const e = parseFloat(efectivo.value) || 0;
    const t = parseFloat(transferencia.value) || 0;
    totalDisplay.textContent = '$' + (e + t).toFixed(2);
  }
  efectivo.addEventListener('input', updateTotal);
  transferencia.addEventListener('input', updateTotal);

  // Default date to today
  const corteFechaInput = document.getElementById('corte-fecha');
  corteFechaInput.value = new Date().toISOString().slice(0, 10);

  document.getElementById('corte-save-btn').addEventListener('click', () => {
    const e = parseFloat(efectivo.value) || 0;
    const t = parseFloat(transferencia.value) || 0;
    const total = e + t;
    const cut = {
      fecha: corteFechaInput.value,
      efectivo: e,
      transferencia: t,
      total: total,
      notas: document.getElementById('corte-notas').value,
      registradoPor: currentUser.name,
      timestamp: new Date().toISOString(),
    };
    cuts.unshift(cut);
    saveCuts();
    renderCuts();
    efectivo.value = '';
    transferencia.value = '';
    document.getElementById('corte-notas').value = '';
    totalDisplay.textContent = '$0.00';
    showToast('✅ Corte guardado correctamente');
  });

  document.getElementById('corte-reset-btn').addEventListener('click', () => {
    efectivo.value = '';
    transferencia.value = '';
    document.getElementById('corte-notas').value = '';
    totalDisplay.textContent = '$0.00';
  });

  // Report dates
  const today = new Date().toISOString().slice(0, 10);
  const week = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  document.getElementById('report-from').value = week;
  document.getElementById('report-to').value   = today;

  document.getElementById('report-csv-btn').addEventListener('click', exportCSV);
  document.getElementById('report-pdf-btn').addEventListener('click', () => {
    showToast('📑 Generando PDF... (funcionalidad de integración externa)');
  });

  refreshMonitoreo();
}

function refreshMonitoreo() {
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter(o => o.creado.startsWith(today));

  // KPIs
  document.getElementById('kpi-today').textContent     = todayOrders.length;
  document.getElementById('kpi-delivered').textContent = todayOrders.filter(o => o.status === 'entregado').length;
  document.getElementById('kpi-pending').textContent   = todayOrders.filter(o => o.status === 'pendiente' || o.status === 'proceso').length;

  // Revenue estimate (fictitious prices)
  const PRICES = { kilo: 20, express: 35, domicilio: 40 };
  const revenue = todayOrders.reduce((sum, o) => {
    const base = PRICES[o.servicio] || 20;
    return sum + base * (parseFloat(o.peso) || 3);
  }, 0);
  document.getElementById('kpi-revenue').textContent = '$' + revenue.toFixed(0);

  // Breakdown bars
  const kiloCount = todayOrders.filter(o => o.servicio === 'kilo').length;
  const exprCount = todayOrders.filter(o => o.servicio === 'express').length;
  const domCount  = todayOrders.filter(o => o.servicio === 'domicilio').length;
  const max = Math.max(kiloCount, exprCount, domCount, 1);

  document.getElementById('count-kilo').textContent = kiloCount;
  document.getElementById('count-express').textContent = exprCount;
  document.getElementById('count-domicilio').textContent = domCount;
  document.getElementById('bar-kilo').style.width     = (kiloCount / max * 100) + '%';
  document.getElementById('bar-express').style.width  = (exprCount / max * 100) + '%';
  document.getElementById('bar-domicilio').style.width = (domCount / max * 100) + '%';

  // Cuts list
  renderCuts();

  // Recent activity
  const activityList = document.getElementById('activity-list');
  const recent = todayOrders.slice(0, 8);
  if (recent.length === 0) {
    activityList.innerHTML = '<p class="no-data">Sin actividad hoy.</p>';
  } else {
    activityList.innerHTML = recent.map(o => `
      <div class="activity-item">
        <span class="activity-time">${new Date(o.creado).toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'})}</span>
        <span class="activity-desc">Nueva orden — ${o.nombre} (${SERVICE_LABELS[o.servicio]||o.servicio})</span>
        <span class="status-badge status-${o.status}">${statusLabel(o.status)}</span>
      </div>
    `).join('');
  }
}

function renderCuts() {
  const list = document.getElementById('cuts-list');
  if (cuts.length === 0) {
    list.innerHTML = '<p class="no-data">No hay cortes registrados aún.</p>';
    return;
  }
  list.innerHTML = cuts.slice(0, 10).map(c => `
    <div class="cut-item">
      <div>
        <span class="cut-date">📅 ${c.fecha}</span>
        <span style="font-size:.75rem;color:var(--neutral-400);margin-left:8px">por ${c.registradoPor}</span>
        ${c.notas ? `<div style="font-size:.75rem;color:var(--neutral-500);margin-top:2px">${c.notas}</div>` : ''}
      </div>
      <span class="cut-amount">$${c.total.toFixed(2)}</span>
    </div>
  `).join('');
}

// ============================================
//  CSV EXPORT
// ============================================
function exportCSV() {
  const from = document.getElementById('report-from').value;
  const to   = document.getElementById('report-to').value;
  const suc  = document.getElementById('report-sucursal').value;

  const filtered = orders.filter(o => {
    const date = o.creado.slice(0, 10);
    const inRange  = (!from || date >= from) && (!to || date <= to);
    const inBranch = suc === 'all' || o.sucursal === suc;
    return inRange && inBranch;
  });

  if (filtered.length === 0) {
    showToast('⚠️ Sin órdenes en el rango seleccionado');
    return;
  }

  const headers = ['ID','Nombre','Teléfono','Servicio','Peso (kg)','Fecha Promesa','Sucursal','Pago','Estatus','Registrado','Registrado por'];
  const rows = filtered.map(o => [
    o.id, o.nombre, o.telefono, o.servicio, o.peso||'',
    fmtDate(o.fecha), o.sucursal, o.pago, o.status,
    fmtDate(o.creado), o.creadoPor
  ]);

  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url;
  a.download = `fastwash_reporte_${from}_${to}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📄 CSV exportado correctamente');
}

// ============================================
//  TOAST NOTIFICATIONS
// ============================================
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('fw-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'fw-toast';
    toast.style.cssText = `
      position:fixed; bottom:80px; left:50%; transform:translateX(-50%) translateY(20px);
      background:var(--neutral-900); color:white; padding:11px 20px; border-radius:100px;
      font-size:.88rem; font-weight:600; z-index:2000; opacity:0;
      transition:.25s ease; white-space:nowrap; box-shadow:0 4px 20px rgba(0,0,0,.3);
      pointer-events:none;
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = '1';
  toast.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(10px)';
  }, duration);
}

// ============================================
//  SEED DEMO ORDERS (first run)
// ============================================
function seedDemoOrders() {
  if (orders.length > 0) return;

  const names = ['María García','Carlos López','Ana Martínez','Jorge Hernández','Laura Sánchez'];
  const phones = ['2381001111','2381002222','2381003333','2381004444','2381005555'];
  const services = ['kilo','express','domicilio','kilo','express'];
  const statuses = ['pendiente','proceso','listo','entregado','pendiente'];
  const branches = ['Centro','Insurgentes','San Lorenzo','Axusco','Moctezuma'];

  const now = Date.now();
  names.forEach((name, i) => {
    orders.push({
      id: 'FW-' + (10001 + i).toString(36).toUpperCase(),
      nombre:   name,
      telefono: phones[i],
      servicio: services[i],
      peso:     (3 + i * 0.5).toFixed(1),
      fecha:    new Date(now + (i - 2) * 60 * 60 * 1000 * 6).toISOString().slice(0, 16),
      sucursal: branches[i],
      instrucciones: i === 2 ? 'No usar suavizante' : '',
      pago:     i % 2 === 0 ? 'efectivo' : 'transferencia',
      status:   statuses[i],
      creado:   new Date(now - (4 - i) * 60 * 60 * 1000).toISOString(),
      creadoPor: 'Sistema Demo',
    });
  });
  saveOrders();
}

// Run seed on load
seedDemoOrders();

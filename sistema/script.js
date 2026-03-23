/* ==============================================
   FASTWASH SISTEMA INTERNO – script.js
   Full app logic: auth, orders, search, QR, reports
   ============================================== */

// ============================================
//  BRANCHES & USERS
// ============================================
const BRANCHES = [
  { id: 'centro',       name: 'Centro',         address: 'Av. Reforma 120, Col. Centro' },
  { id: 'insurgentes',  name: 'Insurgentes',     address: 'Blvd. Insurgentes 450' },
  { id: 'san-lorenzo',  name: 'San Lorenzo',     address: 'Calle Morelos 33, San Lorenzo' },
  { id: 'axusco',       name: 'Axusco',          address: 'Av. Axusco 88, Tehuacán' },
  { id: 'moctezuma',    name: 'Moctezuma',       address: 'Blvd. Moctezuma 210' },
  { id: 'industrial',   name: 'Zona Industrial', address: 'Calle 5 de Mayo 300, Z. Ind.' },
];

const USERS = [
  // Centro
  { username: 'admin.centro',    password: '1234', role: 'admin',    name: 'Carlos Méndez',   branch: 'centro',      avatar: '👨‍💼' },
  { username: 'emp1.centro',     password: '1234', role: 'empleado', name: 'Sofía Ramos',     branch: 'centro',      avatar: '👩‍💼' },
  { username: 'emp2.centro',     password: '1234', role: 'empleado', name: 'Luis Torres',     branch: 'centro',      avatar: '👨‍🔧' },
  // Insurgentes
  { username: 'admin.insurgentes',password:'1234', role: 'admin',    name: 'Ana Flores',      branch: 'insurgentes', avatar: '👩‍💼' },
  { username: 'emp1.insurgentes', password:'1234', role: 'empleado', name: 'Javier López',    branch: 'insurgentes', avatar: '👨‍🔧' },
  // San Lorenzo
  { username: 'admin.sanlorenzo', password:'1234', role: 'admin',    name: 'María García',    branch: 'san-lorenzo', avatar: '👩‍💼' },
  { username: 'emp1.sanlorenzo',  password:'1234', role: 'empleado', name: 'Pedro Sánchez',   branch: 'san-lorenzo', avatar: '👨‍🔧' },
  // Axusco
  { username: 'admin.axusco',    password: '1234', role: 'admin',    name: 'Diego Ruiz',      branch: 'axusco',      avatar: '👨‍💼' },
  { username: 'emp1.axusco',     password: '1234', role: 'empleado', name: 'Elena Vega',      branch: 'axusco',      avatar: '👩‍🔧' },
  // Moctezuma
  { username: 'admin.moctezuma', password: '1234', role: 'admin',    name: 'Patricia Cruz',   branch: 'moctezuma',   avatar: '👩‍💼' },
  { username: 'emp1.moctezuma',  password: '1234', role: 'empleado', name: 'Roberto Díaz',    branch: 'moctezuma',   avatar: '👨‍🔧' },
  // Zona Industrial
  { username: 'admin.industrial',password: '1234', role: 'admin',    name: 'Fernando Gil',    branch: 'industrial',  avatar: '👨‍💼' },
  { username: 'emp1.industrial', password: '1234', role: 'empleado', name: 'Valentina Mora',  branch: 'industrial',  avatar: '👩‍🔧' },
];

// ============================================
//  STATE
// ============================================
let currentUser   = null;
let selectedBranch = null;
let selectedLoginUser = null;
let orders        = loadOrders();
let cuts          = loadCuts();
let activeFilter  = 'all';
let qrScanner     = null;

// ============================================
//  AUTH — 2-STEP BRANCH LOGIN
// ============================================
const loginScreen  = document.getElementById('login-screen');
const appMain      = document.getElementById('app-main');
const loginForm    = document.getElementById('login-form');
const loginError   = document.getElementById('login-error');

// Step 1: render branch grid
function renderBranchGrid() {
  const grid = document.getElementById('branch-grid');
  grid.innerHTML = BRANCHES.map(b => `
    <button class="branch-card" data-branch="${b.id}">
      <span class="branch-icon">📍</span>
      <strong>${b.name}</strong>
      <span>${b.address}</span>
    </button>
  `).join('');

  grid.querySelectorAll('.branch-card').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedBranch = BRANCHES.find(b => b.id === btn.dataset.branch);
      document.getElementById('login-step-branch').style.display = 'none';
      document.getElementById('login-step-user').style.display   = 'block';
      document.getElementById('login-subtitle').textContent = `Sucursal: ${selectedBranch.name}`;
      renderUserCards();
    });
  });
}

// Step 2: render user cards for selected branch
function renderUserCards() {
  const branchUsers = USERS.filter(u => u.branch === selectedBranch.id);
  const container   = document.getElementById('user-cards');
  container.innerHTML = branchUsers.map(u => `
    <button class="user-card ${u.role === 'admin' ? 'admin' : ''}" data-username="${u.username}" type="button">
      <span class="user-card-avatar">${u.avatar}</span>
      <div>
        <strong>${u.name}</strong>
        <span>${u.role === 'admin' ? 'Admin' : 'Empleado'}</span>
      </div>
    </button>
  `).join('');

  selectedLoginUser = null;
  container.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', () => {
      container.querySelectorAll('.user-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedLoginUser = USERS.find(u => u.username === card.dataset.username);
      document.getElementById('login-pass').focus();
    });
  });
}

// Back button
document.getElementById('back-branch-btn').addEventListener('click', () => {
  selectedBranch    = null;
  selectedLoginUser = null;
  document.getElementById('login-step-user').style.display   = 'none';
  document.getElementById('login-step-branch').style.display = 'block';
  document.getElementById('login-subtitle').textContent = 'Selecciona tu sucursal para continuar';
});

// Submit PIN
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const pass = document.getElementById('login-pass').value;
  if (!selectedLoginUser) {
    loginError.textContent = 'Selecciona un usuario.';
    setTimeout(() => { loginError.textContent = ''; }, 3000);
    return;
  }
  if (selectedLoginUser.password !== pass) {
    loginError.textContent = 'PIN incorrecto.';
    setTimeout(() => { loginError.textContent = ''; }, 3000);
    return;
  }
  currentUser = { ...selectedLoginUser, branchName: selectedBranch.name };
  loginScreen.style.display = 'none';
  appMain.style.display     = 'block';
  loginForm.reset();
  initApp();
});

document.getElementById('logout-btn').addEventListener('click', () => {
  currentUser       = null;
  selectedBranch    = null;
  selectedLoginUser = null;
  loginScreen.style.display = 'flex';
  appMain.style.display     = 'none';
  loginForm.reset();
  // Reset to step 1
  document.getElementById('login-step-user').style.display   = 'none';
  document.getElementById('login-step-branch').style.display = 'block';
  document.getElementById('login-subtitle').textContent = 'Selecciona tu sucursal para continuar';
});

// Init branch grid on load
renderBranchGrid();



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
//  INIT APP AFTER LOGIN
// ============================================
function initApp() {
  // Update header: user name, role, and branch
  document.getElementById('user-name-display').textContent = currentUser.name;
  const roleLabel = document.getElementById('user-role-label');
  roleLabel.textContent = currentUser.role === 'admin' ? 'Admin' : 'Empleado';
  document.getElementById('header-branch-label').textContent = currentUser.branchName;
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
    setupConfigTab();
  }

  // Setup renta de máquinas
  setupRenta();

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
      if (target === 'config') setupConfigTab();
    });
  });
}

// ============================================
//  PRICING HELPERS
// ============================================
const DEFAULT_PRICES = { kilo: 12, express: 80, domicilio: 100 };

function loadPrices() {
  try { return { ...DEFAULT_PRICES, ...JSON.parse(localStorage.getItem('fw_prices') || '{}') }; }
  catch { return { ...DEFAULT_PRICES }; }
}
function savePrices(p) { localStorage.setItem('fw_prices', JSON.stringify(p)); }

function calcOrderTotal(servicio, peso) {
  const p = loadPrices();
  if (servicio === 'kilo') {
    const kg = parseFloat(peso) || 0;
    return kg > 0 ? kg * p.kilo : null;
  }
  if (servicio === 'express')   return p.express;
  if (servicio === 'domicilio') return p.domicilio;
  return null;
}

// ============================================
//  NUEVA ORDEN FORM
// ============================================
function setupOrderForm() {
  const form         = document.getElementById('order-form');
  const servicioSel  = document.getElementById('f-servicio');
  const pesoInput    = document.getElementById('f-peso');
  const estimateBox  = document.getElementById('order-estimate-box');
  const domSection   = document.getElementById('domicilio-section');
  const calleInput   = document.getElementById('f-calle');

  // Pre-fill datetime to now + 8 hours
  const fechaInput = document.getElementById('f-fecha');
  fechaInput.value = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 16);

  // Toggle domicilio address section
  servicioSel.addEventListener('change', () => {
    const isDom = servicioSel.value === 'domicilio';
    domSection.style.display = isDom ? 'block' : 'none';
    calleInput.required = isDom;
    updateOrderEstimate();
  });

  function updateOrderEstimate() {
    const p       = loadPrices();
    const serv    = servicioSel.value;
    const kg      = parseFloat(pesoInput.value) || 0;
    const total   = calcOrderTotal(serv, kg);
    if (!serv || total === null) { estimateBox.style.display = 'none'; return; }

    const label    = document.getElementById('oe-label');
    const desglose = document.getElementById('oe-desglose');
    const totalEl  = document.getElementById('oe-total');

    if (serv === 'kilo') {
      label.textContent    = `${kg} kg × $${p.kilo}/kg`;
      desglose.textContent = `= $${total.toFixed(2)}`;
    } else {
      label.textContent    = 'Precio fijo';
      desglose.textContent = '';
    }
    totalEl.textContent = '$' + total.toFixed(2);
    estimateBox.style.display = 'block';
  }

  pesoInput.addEventListener('input', updateOrderEstimate);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const data  = Object.fromEntries(new FormData(form));
    const total = calcOrderTotal(data.servicio, data.peso);
    // Build full name from 3 fields
    const nombre = [data.nombre, data.appaterno, data.apmaterno].filter(Boolean).join(' ');
    // Build address for domicilio
    const direccion = data.servicio === 'domicilio'
      ? [data.calle, data.colonia, data.referencias].filter(Boolean).join(', ')
      : null;
    const order = {
      id:           genId(),
      nombre,
      appaterno:    data.appaterno,
      apmaterno:    data.apmaterno || '',
      telefono:     data.telefono,
      servicio:     data.servicio,
      peso:         data.peso || null,
      fecha:        data.fecha,
      sucursal:     currentUser.branchName,
      instrucciones:data.instrucciones || '',
      direccion,
      pago:         data.pago,
      total,
      status:       'pendiente',
      creado:       new Date().toISOString(),
      creadoPor:    currentUser.name,
    };
    orders.unshift(order);
    saveOrders();
    estimateBox.style.display = 'none';
    domSection.style.display  = 'none';
    calleInput.required = false;
    showTicket(order);
    form.reset();
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
    ${order.direccion ? `<div class="ticket-row"><span>Entrega en</span><span>${order.direccion}</span></div>` : ''}
    <div class="ticket-row"><span>Fecha promesa</span><span>${fmtDate(order.fecha)}</span></div>
    <div class="ticket-row"><span>Sucursal</span><span>${order.sucursal}</span></div>
    <div class="ticket-row"><span>Pago</span><span>${order.pago}</span></div>
    ${order.instrucciones ? `<div class="ticket-row"><span>Notas</span><span>${order.instrucciones}</span></div>` : ''}
    ${order.total != null ? `<div class="ticket-divider"></div><div class="ticket-row total-row"><span>Total</span><strong>$${order.total.toFixed(2)}</strong></div>` : ''}
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
  const branchName = currentUser?.branchName;
  return orders.filter(o => {
    const matchBranch = !branchName || o.sucursal === branchName;
    const matchFilter = activeFilter === 'all' || o.status === activeFilter;
    const matchSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      o.nombre.toLowerCase().includes(q) ||
      o.telefono.includes(q) ||
      o.status.includes(q);
    return matchBranch && matchFilter && matchSearch;
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
//  CONFIG TAB (ADMIN)
// ============================================
let configTabInitialized = false;
function setupConfigTab() {
  if (configTabInitialized) return;
  configTabInitialized = true;
  setupPricingConfig();
  setupConfigMachines();
}

// ============================================
//  PRICING CONFIG (ADMIN)
// ============================================
function setupPricingConfig() {
  const p = loadPrices();
  document.getElementById('price-kilo').value      = p.kilo;
  document.getElementById('price-express').value   = p.express;
  document.getElementById('price-domicilio').value = p.domicilio;

  document.getElementById('prices-save-btn').addEventListener('click', () => {
    const kilo      = parseFloat(document.getElementById('price-kilo').value);
    const express   = parseFloat(document.getElementById('price-express').value);
    const domicilio = parseFloat(document.getElementById('price-domicilio').value);
    if (isNaN(kilo) || isNaN(express) || isNaN(domicilio) || kilo < 0 || express < 0 || domicilio < 0) {
      showToast('⚠️ Ingresa precios válidos'); return;
    }
    savePrices({ kilo, express, domicilio });
    showToast('✅ Precios guardados');
  });
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

  // Revenue — sum of saved order.total values
  const revenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
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

// ============================================
//  RENTA DE MÁQUINAS — CICLO EN SITIO
// ============================================

// Default machine catalog if none stored
const DEFAULT_MACHINES_CFG = [
  { id: 'M001', nombre: 'Lavadora A1', kg: 5,  precio: 20 },
  { id: 'M002', nombre: 'Lavadora A2', kg: 5,  precio: 20 },
  { id: 'M003', nombre: 'Lavadora B1', kg: 8,  precio: 30 },
  { id: 'M004', nombre: 'Lavadora B2', kg: 8,  precio: 30 },
  { id: 'M005', nombre: 'Lavadora C1', kg: 10, precio: 40 },
  { id: 'M006', nombre: 'Lavadora C2', kg: 10, precio: 40 },
  { id: 'M007', nombre: 'Lavadora D1', kg: 15, precio: 60 },
];

let machinesCfg  = loadMachinesCfg();   // configurable catalog
let cycles       = loadCycles();         // completed / active cycle records
let activeHFilter = 'hoy';
let endCycleTargetId = null;            // machine id being ended

function loadMachinesCfg() {
  try { return JSON.parse(localStorage.getItem('fw_machines') || 'null') || DEFAULT_MACHINES_CFG.map(m => ({...m})); }
  catch { return DEFAULT_MACHINES_CFG.map(m => ({...m})); }
}
function saveMachinesCfg() { localStorage.setItem('fw_machines', JSON.stringify(machinesCfg)); }

function loadCycles() {
  try { return JSON.parse(localStorage.getItem('fw_cycles') || '[]'); } catch { return []; }
}
function saveCycles() { localStorage.setItem('fw_cycles', JSON.stringify(cycles)); }

// ---- Main setup ----
function setupRenta() {
  setupSubTabs();
  populateCicloSelect();
  setupCicloForm();
  renderMachinesBoard();
  renderMachineSummary();
  setupHistorialFilters();
  renderHistorial();
  setupEndCycleModal();
}

// ---- Sub-tabs ----
function setupSubTabs() {
  document.querySelectorAll('.sub-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.sub;
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('sub-' + target).classList.add('active');
      if (target === 'maquinas')  { renderMachinesBoard(); renderMachineSummary(); }
      if (target === 'ciclo')     populateCicloSelect();
      if (target === 'historial') renderHistorial();
    });
  });
}

// ---- Machine status helpers ----
function getMachineStatus(m) {
  // A machine is "en-uso" if there's an active cycle for it
  return cycles.some(c => c.machineId === m.id && c.status === 'en-uso') ? 'en-uso' : 'libre';
}

// ---- Machines Board (real-time status) ----
function branchMachines() {
  const bid = currentUser?.branch;
  return bid ? machinesCfg.filter(m => !m.sucursal || m.sucursal === bid) : machinesCfg;
}

function renderMachinesBoard() {
  const board = document.getElementById('machines-board');
  const visible = branchMachines();
  if (visible.length === 0) {
    board.innerHTML = '<p class="no-data">No hay máquinas configuradas para esta sucursal.</p>';
    return;
  }
  board.innerHTML = visible.map(m => {
    const status = getMachineStatus(m);
    const isLibre = status === 'libre';
    const activeCycle = isLibre ? null : cycles.find(c => c.machineId === m.id && c.status === 'en-uso');
    return `
    <div class="machine-card ${status}" data-mid="${m.id}" ${isLibre ? 'title="Toca para iniciar ciclo"' : ''}>
      <div class="machine-status-dot"></div>
      <div class="machine-icon">🫧</div>
      <div class="machine-capacity">${m.kg}<span> kg</span></div>
      <div class="machine-model">${m.nombre}</div>
      <div class="machine-rate">$${m.precio}/ciclo</div>
      <div class="machine-status-label">${isLibre ? 'Libre' : 'En uso'}</div>
      ${activeCycle ? `<div class="machine-client-tag">${activeCycle.nombre || 'Cliente'}</div>` : ''}
    </div>`;
  }).join('');

  // Free machines → go to ciclo tab pre-filled
  board.querySelectorAll('.machine-card.libre').forEach(card => {
    card.addEventListener('click', () => {
      const m = machinesCfg.find(x => x.id === card.dataset.mid);
      if (!m) return;
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-sub="ciclo"]').classList.add('active');
      document.getElementById('sub-ciclo').classList.add('active');
      populateCicloSelect();
      document.getElementById('c-maquina').value = m.id;
      updateCicloPrecio();
    });
  });

  // Busy machines → show end cycle modal
  board.querySelectorAll('.machine-card.en-uso').forEach(card => {
    card.addEventListener('click', () => openEndCycleModal(card.dataset.mid));
  });
}

function renderMachineSummary() {
  const bm     = branchMachines();
  const total  = bm.length;
  const enUso  = bm.filter(m => getMachineStatus(m) === 'en-uso').length;
  const libres = total - enUso;
  const hoy    = ciclosHoy().filter(c => bm.some(m => m.id === c.machineId)).length;
  document.getElementById('machine-summary').innerHTML = `
    <div class="machine-summary-chips">
      <div class="msummary-chip libre"><span class="msum-num">${libres}</span><span>Libres</span></div>
      <div class="msummary-chip en-uso"><span class="msum-num">${enUso}</span><span>En uso</span></div>
      <div class="msummary-chip total"><span class="msum-num">${total}</span><span>Total</span></div>
      <div class="msummary-chip ciclos"><span class="msum-num">${hoy}</span><span>Ciclos hoy</span></div>
    </div>`;
}

// ---- Iniciar Ciclo Form ----
function populateCicloSelect() {
  const sel = document.getElementById('c-maquina');
  const prev = sel.value;
  sel.innerHTML = '<option value="">Seleccionar máquina libre...</option>';
  branchMachines()
    .filter(m => getMachineStatus(m) === 'libre')
    .forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.nombre} – ${m.kg} kg — $${m.precio}`;
      sel.appendChild(opt);
    });
  if (prev) sel.value = prev;
  updateCicloPrecio();
}

function updateCicloPrecio() {
  const mid   = document.getElementById('c-maquina').value;
  const box   = document.getElementById('ciclo-precio-box');
  const sBtn  = document.getElementById('ciclo-submit-btn');
  if (!mid) { box.style.display = 'none'; sBtn.disabled = true; return; }
  const m = machinesCfg.find(x => x.id === mid);
  if (!m) return;
  document.getElementById('cp-capacidad').textContent = m.kg + ' kg';
  document.getElementById('cp-precio').textContent    = '$' + m.precio.toFixed(2);
  box.style.display = 'block';
  sBtn.disabled = false;
}

function setupCicloForm() {
  document.getElementById('c-maquina').addEventListener('change', updateCicloPrecio);

  document.getElementById('ciclo-form').addEventListener('submit', e => {
    e.preventDefault();
    const mid      = document.getElementById('c-maquina').value;
    const nombre   = document.getElementById('c-nombre').value.trim();
    const telefono = document.getElementById('c-telefono').value.trim();
    const pago     = document.querySelector('[name="c-pago"]:checked')?.value || 'efectivo';

    if (!mid) { showToast('⚠️ Selecciona una máquina'); return; }

    const m = machinesCfg.find(x => x.id === mid);
    if (!m) return;

    const cycle = {
      id:         'RC-' + Date.now().toString(36).toUpperCase().slice(-5),
      machineId:  m.id,
      maquina:    m.nombre,
      kg:         m.kg,
      precio:     m.precio,
      nombre:     nombre || 'Sin nombre',
      telefono:   telefono || '',
      sucursal:   currentUser.branchName,
      pago:       pago,
      inicio:     new Date().toISOString(),
      fin:        null,
      status:     'en-uso',
      creadoPor:  currentUser.name,
    };

    cycles.unshift(cycle);
    saveCycles();
    document.getElementById('ciclo-form').reset();
    document.getElementById('ciclo-precio-box').style.display = 'none';
    document.getElementById('ciclo-submit-btn').disabled = true;
    populateCicloSelect();

    showToast('▶️ Ciclo iniciado: ' + m.nombre);

    // Show ticket first — board updates when ticket is closed
    showCycleTicket(cycle);
  });
}

// ---- End cycle modal ----
function setupEndCycleModal() {
  document.getElementById('end-cycle-overlay').addEventListener('click', closeEndCycleModal);
  document.getElementById('end-cycle-close').addEventListener('click', closeEndCycleModal);
  document.getElementById('end-cycle-cancel').addEventListener('click', closeEndCycleModal);
  document.getElementById('end-cycle-confirm').addEventListener('click', () => {
    if (!endCycleTargetId) return;
    const cycle = cycles.find(c => c.machineId === endCycleTargetId && c.status === 'en-uso');
    if (!cycle) return;
    cycle.status = 'completado';
    cycle.fin    = new Date().toISOString();
    const start  = new Date(cycle.inicio);
    const mins   = Math.round((new Date() - start) / 60000);
    cycle.duracion = mins;
    saveCycles();
    closeEndCycleModal();
    renderMachinesBoard();
    renderMachineSummary();
    populateCicloSelect();
    renderHistorial();
    showToast('✅ Ciclo finalizado: ' + cycle.maquina);
  });
}

function openEndCycleModal(machineId) {
  endCycleTargetId = machineId;
  const cycle = cycles.find(c => c.machineId === machineId && c.status === 'en-uso');
  if (!cycle) return;
  const mins = Math.round((new Date() - new Date(cycle.inicio)) / 60000);
  document.getElementById('end-cycle-body').innerHTML = `
    <div class="detail-row"><span class="detail-label">Máquina</span><span class="detail-value">${cycle.maquina} (${cycle.kg} kg)</span></div>
    <div class="detail-row"><span class="detail-label">Cliente</span><span class="detail-value">${cycle.nombre}</span></div>
    ${cycle.telefono ? `<div class="detail-row"><span class="detail-label">Tel.</span><span class="detail-value">${cycle.telefono}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Inicio</span><span class="detail-value">${fmtDate(cycle.inicio)}</span></div>
    <div class="detail-row"><span class="detail-label">Tiempo</span><span class="detail-value">${mins} min</span></div>
    <div class="detail-row"><span class="detail-label">Cobro</span><span class="detail-value" style="font-weight:800;color:var(--blue-600);font-size:1.05rem">$${cycle.precio.toFixed(2)}</span></div>
    <div class="detail-row"><span class="detail-label">Pago</span><span class="detail-value">${cycle.pago}</span></div>
  `;
  document.getElementById('end-cycle-modal').style.display = 'flex';
}

function closeEndCycleModal() {
  document.getElementById('end-cycle-modal').style.display = 'none';
  endCycleTargetId = null;
}

// ---- Cycle ticket ----
function showCycleTicket(cycle) {
  const m      = machinesCfg.find(x => x.id === cycle.machineId) || {};
  const fecha  = fmtDate(cycle.inicio);

  document.getElementById('cycle-ticket-body').innerHTML = `
    <div class="ticket-row"><span>Folio</span><strong>${cycle.id}</strong></div>
    <div class="ticket-row"><span>Fecha</span><strong>${fecha}</strong></div>
    <div class="ticket-divider"></div>
    <div class="ticket-row"><span>Máquina</span><strong>${cycle.maquina}</strong></div>
    <div class="ticket-row"><span>Capacidad</span><strong>${cycle.kg} kg</strong></div>
    <div class="ticket-row"><span>Sucursal</span><strong>${cycle.sucursal}</strong></div>
    <div class="ticket-divider"></div>
    <div class="ticket-row"><span>Cliente</span><strong>${cycle.nombre}</strong></div>
    ${cycle.telefono ? `<div class="ticket-row"><span>Teléfono</span><strong>${cycle.telefono}</strong></div>` : ''}
    <div class="ticket-row"><span>Pago</span><strong>${cycle.pago}</strong></div>
    <div class="ticket-divider"></div>
    <div class="ticket-row total-row"><span>Total cobrado</span><strong>$${cycle.precio.toFixed(2)}</strong></div>
    <div class="ticket-row"><span>Atendió</span><strong>${cycle.creadoPor}</strong></div>
  `;

  // QR with cycle ID
  document.getElementById('cycle-ticket-qr').innerHTML =
    `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${cycle.id}" alt="QR ${cycle.id}" width="100" height="100" /><p class="ticket-id-label">${cycle.id}</p>`;

  document.getElementById('cycle-ticket-modal').style.display = 'flex';

  // Print button
  document.getElementById('cycle-ticket-print').onclick = () => window.print();

  // Close button → switch to board
  document.getElementById('cycle-ticket-close').onclick = closeCycleTicket;
  document.getElementById('cycle-ticket-overlay').onclick = closeCycleTicket;
}

function closeCycleTicket() {
  document.getElementById('cycle-ticket-modal').style.display = 'none';
  // Switch to board
  document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-sub="maquinas"]').classList.add('active');
  document.getElementById('sub-maquinas').classList.add('active');
  renderMachinesBoard();
  renderMachineSummary();
}

// ---- Historial ----
function ciclosHoy() {
  const today = new Date().toISOString().slice(0, 10);
  return cycles.filter(c => c.inicio.startsWith(today));
}

function setupHistorialFilters() {
  document.getElementById('historial-search').addEventListener('input', renderHistorial);
  document.querySelectorAll('[data-hfilter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-hfilter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeHFilter = chip.dataset.hfilter;
      renderHistorial();
    });
  });
}

function renderHistorial() {
  const q    = (document.getElementById('historial-search')?.value || '').toLowerCase();
  const now  = new Date();
  const today = now.toISOString().slice(0, 10);

  let filtered = cycles.filter(c => {
    if (activeHFilter === 'hoy')    return c.inicio.startsWith(today);
    if (activeHFilter === 'semana') {
      const weekAgo = new Date(now - 7 * 864e5).toISOString().slice(0, 10);
      return c.inicio.slice(0, 10) >= weekAgo;
    }
    return true;
  }).filter(c => {
    if (!q) return true;
    return c.id.toLowerCase().includes(q) ||
      c.maquina.toLowerCase().includes(q) ||
      c.nombre.toLowerCase().includes(q);
  });

  // Historial KPIs
  const todayCycles = ciclosHoy();
  const revenue     = todayCycles.filter(c => c.status === 'completado').reduce((s, c) => s + c.precio, 0);
  document.getElementById('historial-kpis').innerHTML = `
    <div class="historial-kpi-grid">
      <div class="h-kpi"><span class="h-kpi-val">${todayCycles.length}</span><span class="h-kpi-label">Ciclos hoy</span></div>
      <div class="h-kpi"><span class="h-kpi-val">${todayCycles.filter(c=>c.status==='completado').length}</span><span class="h-kpi-label">Completados</span></div>
      <div class="h-kpi"><span class="h-kpi-val">${todayCycles.filter(c=>c.status==='en-uso').length}</span><span class="h-kpi-label">En uso ahora</span></div>
      <div class="h-kpi cash"><span class="h-kpi-val">$${revenue.toFixed(0)}</span><span class="h-kpi-label">Ingreso del día</span></div>
    </div>`;

  const list = document.getElementById('cycles-list');
  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><span>🫧</span><p>Sin ciclos en este periodo.</p></div>';
    return;
  }

  list.innerHTML = filtered.map(c => {
    const isActive = c.status === 'en-uso';
    const mins = c.fin
      ? Math.round((new Date(c.fin) - new Date(c.inicio)) / 60000)
      : Math.round((Date.now() - new Date(c.inicio)) / 60000);
    return `
    <div class="rental-card ${isActive ? 'activa' : 'devuelta'}">
      <div class="rental-card-header">
        <div>
          <div class="rental-folio">${c.id}</div>
          <div class="rental-client">🫧 ${c.maquina} (${c.kg} kg)</div>
          <div class="rental-machine">👤 ${c.nombre} · ${c.sucursal}</div>
        </div>
        <span class="status-badge status-${isActive ? 'activa' : 'devuelta'}">${isActive ? 'En uso' : 'Completado'}</span>
      </div>
      <div class="rental-card-footer">
        <span>${fmtDate(c.inicio)} · ${mins} min</span>
        <span style="font-weight:700;color:var(--blue-600)">$${c.precio.toFixed(2)}</span>
      </div>
    </div>`;
  }).join('');
}

// ---- Configuración de máquinas (ADMIN) ----
function setupConfigMachines() {
  document.getElementById('cfg-add-btn').addEventListener('click', () => {
    const nombre = document.getElementById('cfg-nombre').value.trim();
    const kg     = parseFloat(document.getElementById('cfg-kg').value);
    const precio = parseFloat(document.getElementById('cfg-precio').value);
    const sucursal = document.getElementById('cfg-sucursal').value || '';
    if (!nombre || !kg || !precio) { showToast('⚠️ Completa todos los campos'); return; }

    const newMachine = {
      id:     'M' + Date.now().toString(36).toUpperCase().slice(-5),
      nombre, kg, precio, sucursal,
    };
    machinesCfg.push(newMachine);
    saveMachinesCfg();
    document.getElementById('cfg-nombre').value    = '';
    document.getElementById('cfg-kg').value        = '';
    document.getElementById('cfg-precio').value    = '';
    document.getElementById('cfg-sucursal').value  = '';
    renderConfigList();
    renderMachinesBoard();
    renderMachineSummary();
    populateCicloSelect();
    showToast('✅ Máquina agregada: ' + nombre);
  });
  renderConfigList();
}

function renderConfigList() {
  const list = document.getElementById('cfg-machines-list');
  if (machinesCfg.length === 0) {
    list.innerHTML = '<p class="no-data">No hay máquinas. Agrega una arriba.</p>';
    return;
  }
  list.innerHTML = machinesCfg.map(m => {
    const branchLabel = BRANCHES.find(b => b.id === m.sucursal)?.name || 'Todas las sucursales';
    return `
    <div class="cfg-machine-row">
      <div class="cfg-machine-info">
        <span class="cfg-machine-name">${m.nombre}</span>
        <span class="cfg-machine-meta">${m.kg} kg · $${m.precio}/ciclo · 📍 ${branchLabel}</span>
      </div>
      <div class="cfg-machine-actions">
        <button class="btn btn-ghost btn-sm cfg-edit-btn" data-mid="${m.id}">✏️</button>
        <button class="btn btn-ghost btn-sm cfg-del-btn" data-mid="${m.id}" style="color:var(--red-500)">🗑</button>
      </div>
    </div>`;
  }).join('');

  // Edit inline
  list.querySelectorAll('.cfg-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = machinesCfg.find(x => x.id === btn.dataset.mid);
      if (!m) return;
      const newPrecio = parseFloat(prompt(`Nuevo precio por ciclo para ${m.nombre} (${m.kg} kg):`, m.precio));
      if (isNaN(newPrecio) || newPrecio < 0) { showToast('⚠️ Precio inválido'); return; }
      m.precio = newPrecio;
      saveMachinesCfg();
      renderConfigList();
      renderMachinesBoard();
      populateCicloSelect();
      showToast('✅ Precio actualizado');
    });
  });

  // Delete
  list.querySelectorAll('.cfg-del-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const m = machinesCfg.find(x => x.id === btn.dataset.mid);
      if (!m) return;
      if (getMachineStatus(m) === 'en-uso') { showToast('⚠️ La máquina está en uso'); return; }
      if (!confirm(`¿Eliminar "${m.nombre}"?`)) return;
      machinesCfg = machinesCfg.filter(x => x.id !== m.id);
      saveMachinesCfg();
      renderConfigList();
      renderMachinesBoard();
      renderMachineSummary();
      populateCicloSelect();
      showToast('🗑 Máquina eliminada');
    });
  });
}

















function renderMachines(q = '', capFilter = 'all') {
  const grid = document.getElementById('machines-grid');
  let list = MACHINES.filter(m => {
    const matchCap = capFilter === 'all' ||
      (capFilter === '20' ? m.capacidad >= 20 : m.capacidad === parseInt(capFilter));
    const matchQ = !q || m.modelo.toLowerCase().includes(q.toLowerCase()) ||
      m.id.toLowerCase().includes(q.toLowerCase()) || String(m.capacidad).includes(q);
    return matchCap && matchQ;
  });

  if (list.length === 0) {
    grid.innerHTML = '<p class="no-data">No se encontraron máquinas.</p>';
    return;
  }
  grid.innerHTML = list.map(m => `
    <div class="machine-card ${m.estado}" data-id="${m.id}">
      <div class="machine-status-dot"></div>
      <div class="machine-icon">🫧</div>
      <div class="machine-capacity">${m.capacidad}<span> kg</span></div>
      <div class="machine-model">${m.modelo}</div>
      <div class="machine-rate">$${m.tarifa}/día</div>
      <div class="machine-status-label">${getMachineStatusLabel(m.estado)}</div>
    </div>
  `).join('');

  // Click to quick-fill rental form
  grid.querySelectorAll('.machine-card.disponible').forEach(card => {
    card.addEventListener('click', () => {
      const machine = MACHINES.find(m => m.id === card.dataset.id);
      if (!machine) return;
      // Switch to Nueva Renta sub-tab
      document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
      document.querySelector('[data-sub="nueva-renta"]').classList.add('active');
      document.getElementById('sub-nueva-renta').classList.add('active');
      // Fill machine select
      const sel = document.getElementById('r-maquina');
      sel.value = machine.id;
      updateRentaEstimate();
    });
  });
}

function setupMachineFilters() {
  document.getElementById('machine-search').addEventListener('input', e => {
    renderMachines(e.target.value, activeMachineCapFilter);
  });
  document.getElementById('capacity-filters').addEventListener('click', e => {
    const btn = e.target.closest('[data-cap]');
    if (!btn) return;
    document.querySelectorAll('#capacity-filters .chip').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    activeMachineCapFilter = btn.dataset.cap;
    renderMachines(document.getElementById('machine-search').value, activeMachineCapFilter);
  });
}

// ---- Rental form ----
function setupRentaForm() {
  const machSel = document.getElementById('r-maquina');
  const durSel  = document.getElementById('r-duracion');

  // Populate machine select with available machines
  function populateMachineSelect() {
    machSel.innerHTML = '<option value="">Seleccionar máquina disponible...</option>';
    MACHINES.filter(m => m.estado === 'disponible').forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.id} – ${m.modelo} (${m.capacidad} kg) — $${m.tarifa}/día`;
      machSel.appendChild(opt);
    });
  }
  populateMachineSelect();

  // Set default start date to today
  document.getElementById('r-inicio').value = new Date().toISOString().slice(0, 10);

  machSel.addEventListener('change', updateRentaEstimate);
  durSel.addEventListener('change', updateRentaEstimate);

  document.getElementById('renta-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(document.getElementById('renta-form')));
    const machine = MACHINES.find(m => m.id === data.maquina);
    if (!machine) return;

    const dias = parseInt(data.duracion) || 1;
    const fechaFin = new Date(data.inicio);
    fechaFin.setDate(fechaFin.getDate() + dias);

    const rental = {
      id:         'RN-' + Date.now().toString(36).toUpperCase().slice(-5),
      maquinaId:  machine.id,
      maquina:    `${machine.modelo} (${machine.capacidad} kg)`,
      capacidad:  machine.capacidad,
      tarifa:     machine.tarifa,
      nombre:     data.nombre,
      telefono:   data.telefono,
      domicilio:  data.domicilio || '',
      ine:        data.ine || '',
      sucursal:   data.sucursal,
      inicio:     data.inicio,
      dias:       dias,
      fin:        fechaFin.toISOString().slice(0, 10),
      total:      machine.tarifa * dias,
      deposito:   parseFloat(data.deposito) || 0,
      pago:       data['r-pago'],
      notas:      data.notas || '',
      status:     'activa',
      registrado: new Date().toISOString(),
      creadoPor:  currentUser.name,
    };

    // Mark machine as rented
    machine.estado = 'rentada';

    rentals.unshift(rental);
    saveRentals();
    document.getElementById('renta-form').reset();
    document.getElementById('r-inicio').value = new Date().toISOString().slice(0, 10);
    document.getElementById('renta-estimate').style.display = 'none';
    populateMachineSelect();
    renderMachines(document.getElementById('machine-search').value, activeMachineCapFilter);
    showToast('✅ Renta registrada: ' + rental.id);

    // Switch to Rentas Activas
    document.querySelectorAll('.sub-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.sub-panel').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-sub="rentas-activas"]').classList.add('active');
    document.getElementById('sub-rentas-activas').classList.add('active');
    renderRentals();
  });
}

function updateRentaEstimate() {
  const machId = document.getElementById('r-maquina').value;
  const dias   = parseInt(document.getElementById('r-duracion').value) || 0;
  const panel  = document.getElementById('renta-estimate');

  if (!machId || !dias) { panel.style.display = 'none'; return; }

  const machine = MACHINES.find(m => m.id === machId);
  if (!machine) return;

  document.getElementById('est-capacidad').textContent = machine.capacidad + ' kg';
  document.getElementById('est-tarifa').textContent    = '$' + machine.tarifa + '/día';
  document.getElementById('est-dias').textContent      = dias + (dias === 1 ? ' día' : ' días');
  document.getElementById('est-total').textContent     = '$' + (machine.tarifa * dias).toFixed(2);
  panel.style.display = 'block';
}

// ---- Rentals list ----
function getRentaStatus(r) {
  if (r.status === 'devuelta') return 'devuelta';
  if (new Date(r.fin) < new Date()) return 'vencida';
  return 'activa';
}
function rentaStatusLabel(s) {
  return { activa: 'Activa', vencida: 'Vencida', devuelta: 'Devuelta' }[s] || s;
}

function setupRentaSearch() {
  document.getElementById('renta-search').addEventListener('input', renderRentals);
  document.querySelectorAll('[data-rfilter]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('[data-rfilter]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeRentaFilter = chip.dataset.rfilter;
      renderRentals();
    });
  });
}

function renderRentals() {
  const list = document.getElementById('rentals-list');
  const q    = (document.getElementById('renta-search')?.value || '').toLowerCase();

  let filtered = rentals.map(r => ({ ...r, computedStatus: getRentaStatus(r) })).filter(r => {
    const match = activeRentaFilter === 'all' || r.computedStatus === activeRentaFilter;
    const matchQ = !q || r.id.toLowerCase().includes(q) ||
      r.nombre.toLowerCase().includes(q) || r.maquina.toLowerCase().includes(q);
    return match && matchQ;
  });

  if (filtered.length === 0) {
    list.innerHTML = '<div class="empty-state"><span>🫧</span><p>No hay rentas que mostrar.</p></div>';
    return;
  }

  list.innerHTML = filtered.map(r => {
    const s = r.computedStatus;
    const isOverdue = s === 'vencida';
    return `
    <div class="rental-card ${s}" data-rid="${r.id}">
      <div class="rental-card-header">
        <div>
          <div class="rental-folio">${r.id}</div>
          <div class="rental-client">${r.nombre}</div>
          <div class="rental-machine">🫧 ${r.maquina} · ${r.sucursal}</div>
        </div>
        <span class="status-badge status-${s}">${rentaStatusLabel(s)}</span>
      </div>
      <div class="rental-card-footer">
        <span class="${isOverdue ? 'overdue' : ''}">📅 Vence: ${r.fin}${isOverdue ? ' ⚠️' : ''}</span>
        <span style="font-weight:700;color:var(--blue-600)">$${r.total.toFixed(2)}</span>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.rental-card').forEach(card => {
    card.addEventListener('click', () => openRentaModal(card.dataset.rid));
  });
}

// ---- Renta modal ----
function setupRentaModal() {
  document.getElementById('renta-modal-overlay').addEventListener('click', closeRentaModal);
  document.getElementById('renta-modal-close').addEventListener('click', closeRentaModal);

  document.getElementById('renta-return-btn').addEventListener('click', () => {
    if (!openRentaId) return;
    const rental = rentals.find(r => r.id === openRentaId);
    if (!rental) return;
    rental.status = 'devuelta';
    rental.devueltoEn = new Date().toISOString();
    // Free up the machine
    const machine = MACHINES.find(m => m.id === rental.maquinaId);
    if (machine) machine.estado = 'disponible';
    saveRentals();
    closeRentaModal();
    renderRentals();
    renderMachines(document.getElementById('machine-search').value, activeMachineCapFilter);
    // Repopulate machine select
    document.getElementById('r-maquina').innerHTML = '<option value="">Seleccionar máquina disponible...</option>';
    MACHINES.filter(m => m.estado === 'disponible').forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.id;
      opt.textContent = `${m.id} – ${m.modelo} (${m.capacidad} kg) — $${m.tarifa}/día`;
      document.getElementById('r-maquina').appendChild(opt);
    });
    showToast('✅ Máquina marcada como devuelta');
  });

  document.getElementById('renta-extend-btn').addEventListener('click', () => {
    if (!openRentaId) return;
    const rental = rentals.find(r => r.id === openRentaId);
    if (!rental || rental.status === 'devuelta') { showToast('⚠️ No se puede extender una renta devuelta'); return; }
    // Extend by 7 days
    const finDate = new Date(rental.fin);
    finDate.setDate(finDate.getDate() + 7);
    rental.fin  = finDate.toISOString().slice(0, 10);
    rental.dias += 7;
    rental.total = rental.tarifa * rental.dias;
    saveRentals();
    closeRentaModal();
    renderRentals();
    showToast('📅 Renta extendida 7 días más');
  });
}

function openRentaModal(id) {
  const rental = rentals.find(r => r.id === id);
  if (!rental) return;
  openRentaId = id;
  const s = getRentaStatus(rental);

  document.getElementById('renta-modal-title').textContent = 'Renta ' + rental.id;
  document.getElementById('renta-modal-body').innerHTML = `
    <div class="detail-row"><span class="detail-label">Estado</span><span class="status-badge status-${s}">${rentaStatusLabel(s)}</span></div>
    <div class="detail-row"><span class="detail-label">Cliente</span><span class="detail-value">${rental.nombre}</span></div>
    <div class="detail-row"><span class="detail-label">Teléfono</span><span class="detail-value">${rental.telefono}</span></div>
    ${rental.domicilio ? `<div class="detail-row"><span class="detail-label">Domicilio</span><span class="detail-value">${rental.domicilio}</span></div>` : ''}
    ${rental.ine ? `<div class="detail-row"><span class="detail-label">INE</span><span class="detail-value">${rental.ine}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Máquina</span><span class="detail-value">${rental.maquina}</span></div>
    <div class="detail-row"><span class="detail-label">Sucursal</span><span class="detail-value">${rental.sucursal}</span></div>
    <div class="detail-row"><span class="detail-label">Inicio</span><span class="detail-value">${rental.inicio}</span></div>
    <div class="detail-row"><span class="detail-label">Duración</span><span class="detail-value">${rental.dias} días</span></div>
    <div class="detail-row"><span class="detail-label">Vence</span><span class="detail-value">${rental.fin}</span></div>
    <div class="detail-row"><span class="detail-label">Tarifa diaria</span><span class="detail-value">$${rental.tarifa}/día</span></div>
    <div class="detail-row"><span class="detail-label">Total</span><span class="detail-value" style="font-weight:800;color:var(--blue-600)">$${rental.total.toFixed(2)}</span></div>
    <div class="detail-row"><span class="detail-label">Depósito</span><span class="detail-value">$${(rental.deposito||0).toFixed(2)}</span></div>
    <div class="detail-row"><span class="detail-label">Pago</span><span class="detail-value">${rental.pago}</span></div>
    ${rental.notas ? `<div class="detail-row"><span class="detail-label">Notas</span><span class="detail-value">${rental.notas}</span></div>` : ''}
    <div class="detail-row"><span class="detail-label">Registrado</span><span class="detail-value">${fmtDate(rental.registrado)}</span></div>
  `;

  const returnBtn = document.getElementById('renta-return-btn');
  returnBtn.style.display = rental.status === 'devuelta' ? 'none' : '';

  document.getElementById('renta-detail-modal').style.display = 'flex';
}

function closeRentaModal() {
  document.getElementById('renta-detail-modal').style.display = 'none';
  openRentaId = null;
}


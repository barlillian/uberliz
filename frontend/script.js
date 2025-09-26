const connectBtn = document.getElementById('connectBtn');
const storeList = document.getElementById('storeList');
const eventList = document.getElementById('eventList');
const loading = document.getElementById('loading');

let stores = [];
let events = [];
let loadingStores = {}; // Track activating state

// --------------------
// Step 1: OAuth login
// --------------------
connectBtn.addEventListener('click', () => {
  window.location.href = '/oauth/login';
});

// --------------------
// Show / hide loading
// --------------------
function showLoading(msg = '⏳ Loading...') {
  loading.textContent = msg;
  loading.classList.remove('hidden');
}
function hideLoading() {
  loading.classList.add('hidden');
}

// --------------------
// Step 2: Fetch stores
// --------------------
async function fetchStores() {
  showLoading('Fetching stores...');
  try {
    const res = await fetch('/api/stores');
    const data = await res.json();

    if (!res.ok) {
      const msg = `Error ${data.status}: ${data.uber_message}\nNext Action: ${data.next_action}`;
      throw new Error(msg);
    }

    stores = data;
    renderStores();
  } catch (err) {
    alert(`Error fetching stores:\n${err.message}`);
  } finally {
    hideLoading();
  }
}

// --------------------
// Helper: format details recursively
// --------------------
function formatStoreDetails(obj, prefix = '') {
  let html = '';
  for (const key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    const value = obj[key];
    const label = prefix ? `${prefix} → ${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      html += formatStoreDetails(value, label);
    } else {
      html += `<strong>${label}:</strong> ${value !== null && value !== undefined ? value : '-'}<br>`;
    }
  }
  return html;
}

// --------------------
// Toggle store details
// --------------------
function toggleStoreDetails(storeId, store) {
  const detailsDiv = document.getElementById(`details-${storeId}`);
  if (!detailsDiv) return;

  if (detailsDiv.style.display === 'block') {
    detailsDiv.style.display = 'none';
    detailsDiv.innerHTML = '';
  } else {
    detailsDiv.style.display = 'block';

    const box = document.createElement('div');
    box.classList.add('details-box');

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('close-btn');
    closeBtn.textContent = 'X';
    closeBtn.addEventListener('click', () => {
      detailsDiv.style.display = 'none';
      detailsDiv.innerHTML = '';
    });

    box.appendChild(closeBtn);

    const content = document.createElement('div');
    content.classList.add('details-content');
    content.innerHTML = formatStoreDetails(store);
    box.appendChild(content);

    detailsDiv.appendChild(box);
  }
}

// --------------------
// Render store list
// --------------------
function renderStores() {
  storeList.innerHTML = '';
  stores.forEach(store => {
    const li = document.createElement('li');
    li.classList.add('store-item');

    // Left container: name + [+Details]
    const leftDiv = document.createElement('div');
    leftDiv.style.display = 'flex';
    leftDiv.style.alignItems = 'center';
    leftDiv.style.gap = '6px';

    const nameSpan = document.createElement('span');
    nameSpan.innerHTML = `🏬 <strong>${store.name}</strong>`;
    leftDiv.appendChild(nameSpan);

    const detailsBtn = document.createElement('button');
    detailsBtn.textContent = '[+Details]';
    detailsBtn.classList.add('details-btn');
    detailsBtn.addEventListener('click', () => toggleStoreDetails(store.id, store));
    leftDiv.appendChild(detailsBtn);

    li.appendChild(leftDiv);

    // Right container: Link button / status
    const rightDiv = document.createElement('div');
    rightDiv.style.marginLeft = 'auto';
    rightDiv.style.display = 'flex';
    rightDiv.style.alignItems = 'center';
    rightDiv.style.gap = '8px';

    if (store.isActivated) {
      const statusSpan = document.createElement('span');
      statusSpan.textContent = '✅ Activated';
      statusSpan.classList.add('activated');
      rightDiv.appendChild(statusSpan);
    } else if (loadingStores[store.id]) {
      const statusSpan = document.createElement('span');
      statusSpan.textContent = '⏳ Awaiting Uber approval';
      statusSpan.classList.add('activating');
      rightDiv.appendChild(statusSpan);
    } else {
      const btn = document.createElement('button');
      btn.textContent = '👉🏻 Link App to Store';
      btn.classList.add('btn-small');
      btn.disabled = !store.id;
      btn.onclick = () => activateStore(store.id, btn);
      rightDiv.appendChild(btn);
    }

    li.appendChild(rightDiv);

    // Hidden container for details
    const detailsDiv = document.createElement('div');
    detailsDiv.id = `details-${store.id}`;
    detailsDiv.classList.add('store-details');
    li.appendChild(detailsDiv);

    storeList.appendChild(li);
  });
}

// --------------------
// Step 3: Activate store
// --------------------
async function activateStore(storeId, btnElement) {
  if (!storeId) return;

  btnElement.disabled = true;
  loadingStores[storeId] = true;
  renderStores();

  try {
    const res = await fetch(`/api/post_pos_data/${storeId}`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      const msg = `Error ${data.status}: ${data.uber_message}\nNext Action: ${data.next_action}`;
      throw new Error(msg);
    }
  } catch (err) {
    alert(`Error activating store:\n${err.message}`);
    delete loadingStores[storeId];
  } finally {
    btnElement.disabled = false;
    renderStores();
  }
}

// --------------------
// Step 4: Socket.IO real-time updates
// --------------------
const socket = io();

socket.on("storeStatusUpdated", ({ storeId, status }) => {
  const store = stores.find(s => s.id === storeId);
  if (store) {
    store.isActivated = status === "activated";
    delete loadingStores[storeId]; // remove "awaiting" state
    renderStores();
  }
});

socket.on("webhookEvent", (event) => {
  events.unshift(event); // latest on top
  if (events.length > 50) events.pop();
  renderEvents();
});

// --------------------
// Toggle event details
// --------------------
function toggleEventDetails(eventId, eventData) {
  const detailsDiv = document.getElementById(`event-details-${eventId}`);
  if (!detailsDiv) return;

  if (detailsDiv.style.display === 'block') {
    detailsDiv.style.display = 'none';
    detailsDiv.innerHTML = '';
  } else {
    detailsDiv.style.display = 'block';

    const box = document.createElement('div');
    box.classList.add('details-box');

    const closeBtn = document.createElement('span');
    closeBtn.classList.add('close-btn');
    closeBtn.textContent = 'X';
    closeBtn.addEventListener('click', () => {
      detailsDiv.style.display = 'none';
      detailsDiv.innerHTML = '';
    });
    box.appendChild(closeBtn);

    const content = document.createElement('div');
    content.classList.add('details-content');
    content.innerHTML = formatStoreDetails(eventData.raw || eventData);
    box.appendChild(content);

    detailsDiv.appendChild(box);
  }
}

// --------------------
// Render webhook events
// --------------------
function renderEvents() {
  eventList.innerHTML = '';
  events.forEach((e, idx) => {
    const timestamp = e.timestamp || new Date().toISOString();
    const formattedTime = new Date(timestamp).toLocaleString();

    const li = document.createElement('li');
    li.classList.add('event-item');

    const leftDiv = document.createElement('div');
    leftDiv.style.display = 'flex';
    leftDiv.style.alignItems = 'center';
    leftDiv.style.gap = '6px';

    const infoSpan = document.createElement('span');
    infoSpan.innerHTML = `📩 [${formattedTime}] - Event: ${e.type}`;
    leftDiv.appendChild(infoSpan);

    const detailsBtn = document.createElement('button');
    detailsBtn.textContent = '[+Details]';
    detailsBtn.classList.add('details-btn');
    detailsBtn.addEventListener('click', () => toggleEventDetails(idx, e));
    leftDiv.appendChild(detailsBtn);

    li.appendChild(leftDiv);

    const detailsDiv = document.createElement('div');
    detailsDiv.id = `event-details-${idx}`;
    detailsDiv.classList.add('event-details');
    li.appendChild(detailsDiv);

    eventList.appendChild(li);
  });
}

// --------------------
// Step 5: Auto-fetch after OAuth success
// --------------------
window.addEventListener('DOMContentLoaded', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const oauthSuccess = urlParams.get('oauth_success');

  if (oauthSuccess === 'true') fetchStores();

  const cleanUrl = window.location.origin + window.location.pathname;
  window.history.replaceState(null, '', cleanUrl);
});

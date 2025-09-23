const connectBtn = document.getElementById('connectBtn');
const storeList = document.getElementById('storeList');
const eventList = document.getElementById('eventList');
const loading = document.getElementById('loading');

let stores = [];
let events = [];
let loadingStores = {}; // Track which stores are in “activating” state

// --------------------
// Step 1: OAuth login
// --------------------
connectBtn.addEventListener('click', () => {
  window.location.href = '/oauth/login';
});

// --------------------
// Show / hide loading for global messages
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
// Render store list
// --------------------
function renderStores() {
  storeList.innerHTML = '';
  stores.forEach(store => {
    const li = document.createElement('li');
    li.classList.add('store-item');

    const infoSpan = document.createElement('span');
    infoSpan.textContent = `${store.name} | Uber ID: ${store.store_id}`; // Only show Uber info
    li.appendChild(infoSpan);

    if (store.isActivated) {
      const statusSpan = document.createElement('span');
      statusSpan.textContent = ' ✅ Activated';
      statusSpan.classList.add('activated');
      li.appendChild(statusSpan);
    } else if (loadingStores[store.store_id]) {
      // Show per-store activating message
      const statusSpan = document.createElement('span');
      statusSpan.textContent = `⏳ Store Activating...! Waiting for Uber confirmation`;
      statusSpan.classList.add('activating');
      li.appendChild(statusSpan);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Link Store with App';
      btn.classList.add('btn-small');
      btn.onclick = () => activateStore(store.store_id, btn);
      li.appendChild(btn);
    }

    storeList.appendChild(li);
  });
}

// --------------------
// Step 3: Activate store
// --------------------
async function activateStore(storeId, btnElement) {
  btnElement.disabled = true;
  loadingStores[storeId] = true; // Mark store as activating
  renderStores(); // Update UI immediately

  try {
    const res = await fetch(`/api/stores/${storeId}/activate`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      const msg = `Error ${data.status}: ${data.uber_message}\nNext Action: ${data.next_action}`;
      throw new Error(msg);
    }

    alert(`✅ Activation requested for store ${storeId}. Waiting for Uber confirmation...`);
  } catch (err) {
    alert(`Error activating store:\n${err.message}`);
    delete loadingStores[storeId]; // Remove activating state on error
  } finally {
    btnElement.disabled = false;
    renderStores();
  }
}

// --------------------
// Step 4: Socket.IO real-time updates
// --------------------
const socket = io();

socket.on("storeProvisioned", ({ storeId }) => {
  const store = stores.find(s => s.store_id === storeId);
  if (store) {
    store.isActivated = true;
    delete loadingStores[storeId]; // Stop loading when Uber confirms
    renderStores();
    highlightStore(storeId);
  } else {
    fetchStores();
  }
});

socket.on("storeDeprovisioned", ({ storeId }) => {
  const store = stores.find(s => s.store_id === storeId);
  if (store) {
    store.isActivated = false;
    renderStores();
    highlightStore(storeId);
  } else {
    fetchStores();
  }
});

socket.on("webhookEvent", (event) => {
  events.unshift(event);
  if (events.length > 50) events.pop();
  renderEvents();
});

function highlightStore(storeId) {
  const liElements = storeList.querySelectorAll('li');
  liElements.forEach(li => {
    if (li.textContent.includes(storeId)) {
      li.classList.add('highlight');
      setTimeout(() => li.classList.remove('highlight'), 2000);
    }
  });
}

function renderEvents() {
  eventList.innerHTML = '';
  events.forEach(e => {
    const timestamp = e.timestamp || new Date().toISOString();
    const formattedTime = new Date(timestamp).toLocaleString();
    const li = document.createElement('li');
    li.textContent = `[${formattedTime}] ${e.type} | Store ID: ${e.storeId} | Payload: ${JSON.stringify(e.raw)}`;
    eventList.appendChild(li);
  });
}

// --------------------
// Initial fetch
// --------------------
fetchStores();

const connectBtn = document.getElementById('connectBtn');
const storeList = document.getElementById('storeList');
const eventList = document.getElementById('eventList');

let stores = [];
let events = [];

// --------------------
// Step 1: OAuth login
// --------------------
connectBtn.addEventListener('click', () => {
  window.location.href = '/oauth/login';
});

// --------------------
// Step 2: Fetch stores initially
// --------------------
async function fetchStores() {
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

    const nameSpan = document.createElement('span');
    nameSpan.textContent = `${store.name} (${store.store_id})`;
    li.appendChild(nameSpan);

    if (store.isActivated) {
      const span = document.createElement('span');
      span.textContent = '✅ Activated';
      li.appendChild(span);
    } else {
      const btn = document.createElement('button');
      btn.textContent = 'Activate';
      btn.onclick = () => activateStore(store.store_id);
      li.appendChild(btn);
    }

    storeList.appendChild(li);
  });
}

// --------------------
// Step 3: Activate store
// --------------------
async function activateStore(storeId) {
  try {
    const res = await fetch(`/api/stores/${storeId}/activate`, { method: 'POST' });
    const data = await res.json();

    if (!res.ok) {
      const msg = `Error ${data.status}: ${data.uber_message}\nNext Action: ${data.next_action}`;
      throw new Error(msg);
    }

    alert(`✅ Store ${storeId} activated successfully!`);
    await fetchStores();
  } catch (err) {
    alert(`Error activating store:\n${err.message}`);
  }
}

// --------------------
// Step 4: Socket.IO real-time updates
// --------------------
const socket = io(); // Socket.IO connection

// Real-time store activation updates (Handle store.provisioned events)
socket.on("storeProvisioned", ({ storeId }) => {
  const store = stores.find(s => s.store_id === storeId);
  if (store) {
    store.isActivated = true;
    renderStores();

    // Highlight the updated store
    const liElements = storeList.querySelectorAll('li');
    liElements.forEach(li => {
      if (li.textContent.includes(storeId)) {
        li.classList.add('highlight');
        setTimeout(() => li.classList.remove('highlight'), 2000); // 2s flash
      }
    });

  } else {
    // If store is new, fetch updated list
    fetchStores();
  }
});

// Real-time webhook events
socket.on("webhookEvent", (event) => {
  events.unshift(event); // newest events on top
  if (events.length > 50) events.pop();
  renderEvents();
});

// Render webhook events
function renderEvents() {
  eventList.innerHTML = '';
  events.forEach(e => {
    const timestamp = e.timestamp || new Date().toISOString();
    const formattedTime = new Date(timestamp).toLocaleString();
    const li = document.createElement('li');
    li.textContent = `[${formattedTime}] ${JSON.stringify(e.raw)}`;
    eventList.appendChild(li);
  });
}

// --------------------
// Initial fetch
// --------------------
fetchStores();

const connectBtn = document.getElementById('connectBtn');
const storeList = document.getElementById('storeList');
const eventList = document.getElementById('eventList'); // <-- new

// Step 1: Redirect to backend OAuth login
connectBtn.addEventListener('click', () => {
  window.location.href = '/oauth/login';
});

// Step 2: Fetch stores from backend
async function fetchStores() {
  try {
    const res = await fetch('/api/stores');
    if (!res.ok) throw new Error(await res.text());
    const stores = await res.json();
    storeList.innerHTML = '';
    stores.forEach(store => {
      const li = document.createElement('li');
      li.textContent = `${store.name} (${store.internalId}) `;
      const btn = document.createElement('button');
      btn.textContent = 'Activate';
      btn.onclick = () => activateStore(store.store_id);
      li.appendChild(btn);
      storeList.appendChild(li);
    });
  } catch (err) {
    alert('Error fetching stores: ' + err.message);
  }
}

// Step 3: Activate store
async function activateStore(storeId) {
  try {
    const res = await fetch(`/api/stores/${storeId}/activate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error(await res.text());
    alert(await res.text());
  } catch (err) {
    alert('Error activating store: ' + err.message);
  }
}

// Step 4: Fetch webhook events
async function fetchEvents() {
  try {
    const res = await fetch('/api/debug/events');
    if (!res.ok) throw new Error(await res.text());
    const events = await res.json();
    eventList.innerHTML = '';
    events.forEach(e => {
      const li = document.createElement('li');
      li.textContent = `[${e.timestamp}] ${JSON.stringify(e.event)}`;
      eventList.appendChild(li);
    });
  } catch (err) {
    console.error('Error fetching events: ' + err.message);
  }
}

// Poll for stores if already logged in
fetchStores();

// Poll for events every 5s
setInterval(fetchEvents, 5000);

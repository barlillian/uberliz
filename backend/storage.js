const storage = {
  userTokens: {},
  merchantStores: {},
  internalStoreMap: {},
  activationStatus: {},
  oauthState: null,
  events: [],
  initActivationStatus(stores) {
    stores.forEach(store => { const uuid = store.store_id; if (!this.activationStatus[uuid]) this.activationStatus[uuid] = "pending"; });
  },
  clearAll() { this.userTokens = {}; this.merchantStores = {}; this.internalStoreMap = {}; this.activationStatus = {}; this.oauthState = null; this.events = []; }
};

module.exports = storage;

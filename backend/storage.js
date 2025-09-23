const storage = {
  userTokens: {},       // { [tokenKey]: { access_token, refresh_token, expires_in, obtained_at } }
  merchantStores: {},   // { [tokenKey]: [storeList] }
  internalStoreMap: {}, // { [uberStoreId]: { tokenKey, name, address, merchant_store_id } }
  activationStatus: {}, // { [uberStoreId]: "pending" | "activated" | "deactivated" | <status> }
  oauthStates: {},      // { [state]: true } for per-session OAuth state
  events: [],

  initActivationStatus(stores) {
    stores.forEach(store => {
      const uuid = store.id; // use Uber's store.id here
      if (!this.activationStatus[uuid]) this.activationStatus[uuid] = "pending";
    });
  },

  clearAll() {
    this.userTokens = {};
    this.merchantStores = {};
    this.internalStoreMap = {};
    this.activationStatus = {};
    this.oauthStates = {};
    this.events = [];
  }
};

module.exports = storage;

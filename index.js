const axios = require("axios");
const { api_key, server_name, api_matching_url } = require("./config.json");

const api = axios.create({
  timeout: 3000,
  maxRedirects: 0,
  headers: { "Content-Type": "application/json" },
});


const QueueType = {
  DUNGEON: 0,
  BATTLEGROUND: 1,
  ALL: 2
};

// Use the single endpoint for all queue types
const queueEndpoint = api_matching_url;

// Helper function to make API requests, handling ALL case with two requests
function makeApiRequest(queueData, headers) {
  if (queueData.type === QueueType.ALL) {
    // For ALL type, make two separate requests in parallel
    // Server expects type: 0 for dungeons, type: 1 for battlegrounds
    const requests = [
      api.post(queueEndpoint, { ...queueData, type: QueueType.DUNGEON }, { headers }).catch(() => {}),
      api.post(queueEndpoint, { ...queueData, type: QueueType.BATTLEGROUND }, { headers }).catch(() => {})
    ];
    return Promise.all(requests);
  } else {
    // For specific types, make single request
    return api.post(queueEndpoint, queueData, { headers });
  }
}


module.exports = function (mod) {
  if (!api_key) return;

  let queues = [{}, {}];
  let isSender = false;

  mod.hook("C_CHANGE_PARTY_MANAGER", "raw", () => (isSender = false));
  mod.hook("C_ADD_INTER_PARTY_MATCH_POOL", "raw", () => (isSender = true));

  mod.hook("S_ADD_INTER_PARTY_MATCH_POOL", 1, (e) => {
    if (!isSender) return;
    const t = +e.type;
    if (queues[t] && queues[t].matching_state === 1) return; // Already in queue
    console.log(`Sending queue data from ${server_name} for ${e.instances.map((i) => `${i.id}`)}`);
    queues[t] = {
      type: t,
      players: e.players.length, // Convert array to count
      instances: e.instances.map((i) => `${i.id}`),
      server: server_name,
      matching_state: 1,
    };

    setImmediate(() =>
      makeApiRequest(queues[t], { Authorization: `Bearer ${api_key}` })
        .catch(() => {})
    );
  });

  mod.hook("S_DEL_INTER_PARTY_MATCH_POOL", "*", (e) => {
    if (!isSender) return;
    const t = +e.type;
    const clearQueue = (idx) => {
      if (queues[idx] && queues[idx].matching_state === 1) {
        const deleteData = { ...queues[idx], matching_state: 0 };
        setImmediate(() =>
          makeApiRequest(deleteData, { Authorization: `Bearer ${api_key}` })
            .then(() => {
              queues[idx] = {};
            })
            .catch(() => (queues[idx] = {}))
        );
      }
    };

    if (t === QueueType.ALL) {
      clearQueue(0);
      clearQueue(1);
    } else {
      clearQueue(t);
    }
    isSender = false;
  });

  // Handle queue pop/match found
  mod.hook("S_FIN_INTER_PARTY_MATCH", "raw", () => {
    if (!isSender) return;
    if (queues[0] && queues[0].matching_state === 1) {
      const deleteData = { ...queues[0], matching_state: 0 };
      setImmediate(() =>
        makeApiRequest(deleteData, { Authorization: `Bearer ${api_key}` })
          .then(() => (queues[0] = {}))
          .catch(() => (queues[0] = {}))
      );
    }
    // Also clear BG queue if active (match found clears all)
    if (queues[1] && queues[1].matching_state === 1) {
      const deleteData = { ...queues[1], matching_state: 0 };
      setImmediate(() =>
        makeApiRequest(deleteData, { Authorization: `Bearer ${api_key}` })
          .then(() => (queues[1] = {}))
          .catch(() => (queues[1] = {}))
      );
    }
    isSender = false;
  });

  this.destructor = () => {
    queues.forEach((q) => {
      if (q && q.matching_state === 1) {
        const deleteData = { ...q, matching_state: 0 };
        setImmediate(() =>
          makeApiRequest(deleteData, { Authorization: `Bearer ${api_key}` })
            .catch(() => {})
        );
      }
    });
  };
};

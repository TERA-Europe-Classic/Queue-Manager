const axios = require("axios");
const { api_key, server_name, api_matching_url } = require("./config.json");

const api = axios.create({
  timeout: 3000,
  maxRedirects: 0,
  headers: { "Content-Type": "application/json" },
});

let queues = [{}, {}];
let isSender = false;

module.exports = function (mod) {
  if (!api_key) return;

  mod.hook("C_CHANGE_PARTY_MANAGER", "raw", () => (isSender = false));
  mod.hook("C_ADD_INTER_PARTY_MATCH_POOL", "raw", () => (isSender = true));

  mod.hook("S_ADD_INTER_PARTY_MATCH_POOL", 1, (e) => {
    if (!isSender) return;
    const t = +e.type;
    queues[t] = {
      type: t,
      players: e.players,
      instances: e.instances.map((i) => `${i.id}`),
      server: server_name,
      matching_state: 1,
    };

    setImmediate(() =>
      api
        .post(api_matching_url, queues[t], {
          headers: { Authorization: `Bearer ${api_key}` },
        })
        .catch(() => {})
    );
  });

  mod.hook("S_DEL_INTER_PARTY_MATCH_POOL", "*", (e) => {
    if (!isSender) return;
    const t = +e.type;
    if (queues[t]) {
      queues[t].matching_state = 0;
      setImmediate(() =>
        api
          .post(api_matching_url, queues[t], {
            headers: { Authorization: `Bearer ${api_key}` },
          })
          .then(() => {
            queues[t] = {};
          })
          .catch(() => (queues[t] = {}))
      );
    }
    isSender = false;
  });

  // Handle queue pop/match found for dungeons
  mod.hook("S_SHOW_PARTY_MATCH_INFO", "raw", () => {
    if (queues[0].matching_state === 1) {
      queues[0].matching_state = 0;
      setImmediate(() =>
        api
          .post(api_matching_url, queues[0], {
            headers: { Authorization: `Bearer ${api_key}` },
          })
          .then(() => (queues[0] = {}))
          .catch(() => (queues[0] = {}))
      );
    }
    // Also clear BG queue if active (match found clears all)
    if (queues[1].matching_state === 1) {
      queues[1].matching_state = 0;
      setImmediate(() =>
        api
          .post(api_matching_url, queues[1], {
            headers: { Authorization: `Bearer ${api_key}` },
          })
          .then(() => (queues[1] = {}))
          .catch(() => (queues[1] = {}))
      );
    }
  });

  // Handle queue pop/match found for battlegrounds
  mod.hook("S_BATTLE_FIELD_ENTRANCE_INFO", "raw", () => {
    if (queues[1].matching_state === 1) {
      queues[1].matching_state = 0;
      setImmediate(() =>
        api
          .post(api_matching_url, queues[1], {
            headers: { Authorization: `Bearer ${api_key}` },
          })
          .then(() => (queues[1] = {}))
          .catch(() => (queues[1] = {}))
      );
    }
    // Also clear dungeon queue if active (match found clears all)
    if (queues[0].matching_state === 1) {
      queues[0].matching_state = 0;
      setImmediate(() =>
        api
          .post(api_matching_url, queues[0], {
            headers: { Authorization: `Bearer ${api_key}` },
          })
          .then(() => (queues[0] = {}))
          .catch(() => (queues[0] = {}))
      );
    }
  });

  this.destructor = () => {
    queues.forEach((q) => {
      if (q.matching_state === 1) {
        q.matching_state = 0;
        setImmediate(() =>
          api
            .post(api_matching_url, q, {
              headers: { Authorization: `Bearer ${api_key}` },
            })
            .catch(() => {})
        );
      }
    });
  };
};

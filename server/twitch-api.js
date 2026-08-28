const sseManager = require('./sse-manager');

let pollingInterval = null;
let lastPinnedId = null;

/**
 * Appel de l'endpoint Helix REST officiel GET /chat/pinned_messages
 */
async function fetchPinnedMessage(configStore) {
  const accessToken = configStore.get('accessToken');
  const clientId = configStore.get('clientId');
  const broadcasterId = configStore.get('broadcasterId');

  if (!accessToken || !clientId || !broadcasterId) {
    return;
  }

  try {
    // broadcaster_id et moderator_id sont identiques si tu es le streamer connecté
    const url = `https://api.twitch.tv/helix/chat/pins?broadcaster_id=${encodeURIComponent(broadcasterId)}&moderator_id=${encodeURIComponent(broadcasterId)}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Client-ID': clientId.trim(),
        'Authorization': `Bearer ${accessToken.trim()}`
      }
    });

    if (response.status === 401) {
      console.warn('[Twitch API] Jeton non autorisé ou expiré.');
      return;
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`[Twitch API] Erreur HTTP ${response.status}:`, errText);
      return;
    }

    const json = await response.json();
    console.log('[Twitch API - Live Test] Données reçues :', JSON.stringify(json, null, 2));

    const pinnedList = json.data || [];

    if (pinnedList.length === 0) {
      if (lastPinnedId !== null) {
        lastPinnedId = null;
        sseManager.broadcast({ active: false });
      }
    } else {
      const pinnedItem = pinnedList[0];
      if (pinnedItem.message_id !== lastPinnedId && pinnedItem.id !== lastPinnedId) {
        lastPinnedId = pinnedItem.message_id || pinnedItem.id;
        console.log('[Twitch API] Nouveau message épinglé capturé !');
        sseManager.broadcast({
          active: true,
          pinnedMessage: pinnedItem
        });
      }
    }
  } catch (err) {
    console.error('[Twitch API] Erreur lors de l’appel :', err);
  }
}

function startPolling(configStore) {
  stopPolling();
  fetchPinnedMessage(configStore);
  // Polling toutes les 3 secondes sur l'API Helix
  pollingInterval = setInterval(() => {
    fetchPinnedMessage(configStore);
  }, 3000);
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
}

module.exports = { startPolling, stopPolling, fetchPinnedMessage };
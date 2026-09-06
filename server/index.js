const express = require('express');
const path = require('path');
const sseManager = require('./sse-manager');
const { startPolling } = require('./twitch-api');

const DEFAULT_CLIENT_ID = 'liqjwr59t8nbvi7edpfsn5sl0xyfoj';
let serverInstance = null;
const DEFAULT_STYLE = require('./default-style');

// Dictionnaire global côté serveur
const thirdPartyEmotes = {};

// Fonction pour récupérer les émotes 7TV + BTTV
async function fetchThirdPartyEmotes(broadcasterId) {
  try {
    // 1. 7TV Globales
    const res7tvGlobal = await fetch('https://7tv.io/v3/emote-sets/global');
    if (res7tvGlobal.ok) {
      const data = await res7tvGlobal.json();
      (data.emotes || []).forEach(e => {
        const name = e.name || e.data?.name;
        if (name) thirdPartyEmotes[name] = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
      });
    }

    // 2. 7TV Chaîne
    if (broadcasterId) {
      const res7tvChannel = await fetch(`https://7tv.io/v3/users/twitch/${broadcasterId}`);
      if (res7tvChannel.ok) {
        const data = await res7tvChannel.json();
        (data.emote_set?.emotes || []).forEach(e => {
          const name = e.name || e.data?.name;
          if (name) thirdPartyEmotes[name] = `https://cdn.7tv.app/emote/${e.id}/2x.webp`;
        });
      }
    }

    // 3. BTTV Globales
    const resBttvGlobal = await fetch('https://api.betterttv.net/3/cached/emotes/global');
    if (resBttvGlobal.ok) {
      const data = await resBttvGlobal.json();
      data.forEach(e => { thirdPartyEmotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`; });
    }

    // 4. BTTV Chaîne
    if (broadcasterId) {
      const resBttvChannel = await fetch(`https://api.betterttv.net/3/cached/users/twitch/${broadcasterId}`);
      if (resBttvChannel.ok) {
        const data = await resBttvChannel.json();
        const channelEmotes = [...(data.channelEmotes || []), ...(data.sharedEmotes || [])];
        channelEmotes.forEach(e => { thirdPartyEmotes[e.code] = `https://cdn.betterttv.net/emote/${e.id}/2x`; });
      }
    }

    console.log(`[Express] Émotes tiers prêtes : ${Object.keys(thirdPartyEmotes).length} chargées.`);
  } catch (err) {
    console.error('[Express] Erreur lors du chargement des émotes tiers :', err);
  }
}

function startServer(configStore) {
  return new Promise((resolve) => {
    const app = express();
    const port = configStore.get('port') || 3000;

    app.use(express.json());

    const publicPath = path.join(__dirname, '..', 'public');
    app.use(express.static(publicPath));
    app.use('/overlay', express.static(path.join(publicPath, 'overlay')));
    app.use('/admin', express.static(path.join(publicPath, 'admin')));

    app.get('/', (req, res) => res.redirect('/admin'));

    // API Status qui renvoie aussi les émotes
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'ok',
        authenticated: Boolean(configStore.get('accessToken')),
        broadcasterId: configStore.get('broadcasterId') || null,
        broadcasterName: configStore.get('broadcasterName') || null,
        emotes: thirdPartyEmotes // Transmission directe à l'overlay
      });
    });

    // Flux SSE
    app.get('/api/stream', (req, res) => {
      sseManager.addClient(req, res);
    });

    // Auth Twitch
    app.get('/auth/twitch', (req, res) => {
      const clientId = configStore.get('clientId') || DEFAULT_CLIENT_ID;
      const redirectUri = `http://localhost:${port}/auth/callback`;
      const scope = 'user:read:chat moderator:read:chat_messages channel:read:redemptions';

      const twitchAuthUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;
      res.redirect(twitchAuthUrl);
    });

    app.get('/auth/callback', (req, res) => {
      res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head><meta charset="UTF-8"><title>Validation...</title></head>
        <body>
          <p>Validation en cours...</p>
          <script>
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            const accessToken = params.get('access_token');

            if (accessToken) {
              fetch('/auth/save-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ accessToken })
              }).then(() => {
                window.location.href = '/admin';
              });
            } else {
              document.body.innerHTML = 'Erreur lors de l’authentification Twitch.';
            }
          </script>
        </body>
        </html>
      `);
    });

    // Récupérer le style actuel
    app.get('/api/style', (req, res) => {
      const config = configStore.getAll ? configStore.getAll() : {};
      const currentStyle = config.style || DEFAULT_STYLE;
      res.json(currentStyle);
    });

    // Enregistrer le nouveau style
    app.post('/api/style', (req, res) => {
      try {
        const newStyle = req.body;
        
        // Sauvegarde dans la configuration Electron
        configStore.saveConfig({ style: newStyle });

        // Envoi en temps réel via SSE
        sseManager.broadcast({ type: 'STYLE_UPDATE', style: newStyle });

        res.json({ success: true, style: newStyle });
      } catch (err) {
        console.error('[API Style] Erreur de sauvegarde :', err);
        res.status(500).json({ error: 'Impossible de sauvegarder le style' });
      }
    });

    app.post('/api/style/reset', (req, res) => {
      try {
        configStore.saveConfig({ style: DEFAULT_STYLE });
        sseManager.broadcast({ type: 'STYLE_UPDATE', style: DEFAULT_STYLE });
        res.json({ success: true, style: DEFAULT_STYLE });
      } catch (err) {
        console.error('[API Style] Erreur de réinitialisation :', err);
        res.status(500).json({ error: 'Impossible de réinitialiser le style' });
      }
    });

    app.post('/auth/save-token', async (req, res) => {
      const { accessToken } = req.body;
      const clientId = configStore.get('clientId') || DEFAULT_CLIENT_ID;

      try {
        const userResponse = await fetch('https://api.twitch.tv/helix/users', {
          headers: {
            'Client-ID': clientId.trim(),
            'Authorization': `Bearer ${accessToken.trim()}`
          }
        });

        const userData = await userResponse.json();
        if (!userResponse.ok) throw new Error(userData.message);

        const user = userData.data[0];

        configStore.saveConfig({
          accessToken: accessToken,
          broadcasterId: user.id,
          broadcasterName: user.display_name || user.login
        });

        startPolling(configStore);
        res.json({ success: true });
      } catch (err) {
        console.error('Erreur token :', err);
        res.status(500).json({ error: err.message });
      }
    });

    serverInstance = app.listen(port, async () => {
      console.log(`[Express] Serveur actif sur http://localhost:${port}`);
      const broadcasterId = configStore.get('broadcasterId');
      await fetchThirdPartyEmotes(broadcasterId);

      if (configStore.get('accessToken') && broadcasterId) {
        startPolling(configStore);
      }
      resolve(port);
    });
  });
}

function stopServer() {
  if (serverInstance) serverInstance.close();
}

module.exports = { startServer, stopServer };
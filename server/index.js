const express = require('express');
const path = require('path');
const sseManager = require('./sse-manager');
const { startPolling } = require('./twitch-api');

const DEFAULT_CLIENT_ID = 'TON_CLIENT_ID_TWITCH_ICI';
let serverInstance = null;

function startServer(configStore) {
  return new Promise((resolve) => {
    const app = express();
    const port = configStore.get('port') || 3000;

    if (!configStore.get('clientId')) {
      configStore.saveConfig({ clientId: DEFAULT_CLIENT_ID });
    }

    app.use(express.json());

    const publicPath = path.join(__dirname, '..', 'public');

    // Rend tout le dossier public accessible
    app.use(express.static(publicPath));

    // Routes dédiées explicites
    app.use('/overlay', express.static(path.join(publicPath, 'overlay')));
    app.use('/admin', express.static(path.join(publicPath, 'admin')));

    app.get('/', (req, res) => res.redirect('/admin'));

    // Status API
    app.get('/api/status', (req, res) => {
      res.json({
        status: 'ok',
        authenticated: Boolean(configStore.get('accessToken')),
        broadcasterName: configStore.get('broadcasterName') || null
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

    serverInstance = app.listen(port, () => {
      console.log(`[Express] Serveur actif sur http://localhost:${port}`);
      if (configStore.get('accessToken') && configStore.get('broadcasterId')) {
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
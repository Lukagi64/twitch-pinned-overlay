class SSEManager {
  constructor() {
    this.clients = new Set();
    this.currentPinnedMessage = null;
  }

  // Ajoute un client SSE (l'overlay OBS)
  addClient(req, res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    this.clients.add(res);

    // Envoie immédiatement le dernier message connu lors de la connexion
    if (this.currentPinnedMessage) {
      res.write(`data: ${JSON.stringify(this.currentPinnedMessage)}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ active: false })}\n\n`);
    }

    // Nettoyage lors de la déconnexion
    req.on('close', () => {
      this.clients.delete(res);
    });
  }

  // Broadcast du nouveau message à tous les overlays connectés
  broadcast(pinnedData) {
    this.currentPinnedMessage = pinnedData;
    const payload = `data: ${JSON.stringify(pinnedData)}\n\n`;
    
    for (const client of this.clients) {
      client.write(payload);
    }
  }
}

module.exports = new SSEManager();
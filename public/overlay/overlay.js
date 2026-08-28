document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pinned-container');
  const authorEl = document.getElementById('author-name');
  const textEl = document.getElementById('message-text');
  const pinnedByEl = document.getElementById('pinned-by');

  // Connexion au flux SSE du serveur Express
  const eventSource = new EventSource('/api/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.active && data.pinnedMessage) {
        const item = data.pinnedMessage;
        
        // Extraction des champs de l'API Helix
        const author = item.message?.sender_user_name || item.user_name || 'Anonyme';
        const text = item.message?.text || item.text || '';
        const pinnedBy = item.pinned_by_user_name ? `par ${item.pinned_by_user_name}` : '';

        // Mise à jour du contenu HTML
        authorEl.textContent = author;
        textEl.textContent = text;
        pinnedByEl.textContent = pinnedBy;

        // Affichage de la carte
        container.classList.remove('hidden');
      } else {
        // Masquage de la carte si aucun message n'est épinglé
        container.classList.add('hidden');
      }
    } catch (err) {
      console.error('[Overlay SSE] Erreur de lecture des données :', err);
    }
  };

  eventSource.onerror = () => {
    console.warn('[Overlay SSE] Connexion interrompue. Nouvelle tentative...');
  };
});
document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('pinned-container');
  const authorEl = document.getElementById('author-name');
  const textEl = document.getElementById('message-text');
  const pinnedByEl = document.getElementById('pinned-by');

  // Connexion au flux SSE
  const eventSource = new EventSource('/api/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.active && data.pinnedMessage) {
        const item = data.pinnedMessage;
        
        // Extraction de l'auteur et du modérateur
        const author = item.message?.sender_user_name || item.user_name || 'Anonyme';
        const pinnedBy = item.pinned_by_user_name ? `par ${item.pinned_by_user_name}` : '';

        // Construction du contenu du message avec gestion des émotes
        const fragments = item.message?.fragments || [];
        
        if (fragments.length > 0) {
          // Si des fragments existent, on construit le HTML avec les images des émotes
          textEl.innerHTML = renderFragments(fragments);
        } else {
          // Sinon fallback en texte brut
          textEl.textContent = item.message?.text || item.text || '';
        }

        // Mise à jour des textes
        authorEl.textContent = author;
        pinnedByEl.textContent = pinnedBy;

        // Affichage de l'overlay
        container.classList.remove('hidden');
      } else {
        // Masquage si aucun message n'est épinglé
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

/**
 * Transforme les fragments du message Twitch en HTML (texte + émotes)
 */
function renderFragments(fragments) {
  return fragments.map(fragment => {
    if (fragment.type === 'emote' && fragment.emote?.id) {
      const emoteId = fragment.emote.id;
      // URL officielle du CDN Twitch pour les émotes (taille 2.0)
      const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/2.0`;
      return `<img class="twitch-emote" src="${emoteUrl}" alt="${escapeHtml(fragment.text)}" title="${escapeHtml(fragment.text)}" />`;
    }
    
    // Texte brut (sécurisé contre le XSS)
    return escapeHtml(fragment.text);
  }).join('');
}

/**
 * Nettoie le texte brut pour éviter les injections HTML/XSS
 */
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
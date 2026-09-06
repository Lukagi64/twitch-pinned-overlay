window.thirdPartyEmotes = new Map();
let currentStyle = null;

document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('pinned-container');
  const authorEl = document.getElementById('author-name');
  const textEl = document.getElementById('message-text');
  const pinnedByEl = document.getElementById('pinned-by');
  const timestampEl = document.getElementById('pinned-timestamp');

  // 1. Charger le style initial et les émotes depuis le serveur
  try {
    const [statusRes, styleRes] = await Promise.all([
      fetch('/api/status'),
      fetch('/api/style')
    ]);

    const status = await statusRes.json();
    if (status.emotes) {
      Object.entries(status.emotes).forEach(([name, url]) => {
        window.thirdPartyEmotes.set(name, url);
      });
    }

    if (styleRes.ok) {
      currentStyle = await styleRes.json();
      applyCustomStyle(currentStyle);
    }
  } catch (err) {
    console.error('[Overlay] Erreur d’initialisation :', err);
  }

  // 2. Écouter les modifications SSE (OBS Studio)
  const eventSource = new EventSource('/api/stream');

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Mise à jour du style à la volée via SSE
      if (data.type === 'STYLE_UPDATE' && data.style) {
        currentStyle = data.style;
        applyCustomStyle(currentStyle);
        return;
      }

      // Rendu d'un message épinglé
      if (data.active && data.pinnedMessage) {
        const item = data.pinnedMessage;
        
        const author = item.message?.sender_user_name || item.user_name || 'Anonyme';
        const pinnedBy = item.pinned_by_user_name ? `par ${item.pinned_by_user_name}` : '';
        const fragments = item.message?.fragments || [];

        textEl.innerHTML = renderFragments(fragments, window.thirdPartyEmotes);
        authorEl.textContent = author;
        pinnedByEl.textContent = pinnedBy;

        // Horodatage du message (Date et Heure)
        if (item.created_at && timestampEl) {
          const date = new Date(item.created_at);
          timestampEl.textContent = `• ${date.toLocaleDateString()} à ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }

        container.classList.remove('hidden');
      } else {
        container.classList.add('hidden');
      }
    } catch (err) {
      console.error('[Overlay SSE] Erreur :', err);
    }
  };

  // 3. Écouter le mode prévisualisation depuis la page style.html (via iframe)
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'PREVIEW_STYLE') {
      const { config } = event.data;
      applyCustomStyle(config);

      // Afficher le message de test dans la fenêtre de prévisualisation
      if (config.testText) {
        textEl.innerHTML = renderFragments([{ text: config.testText }], window.thirdPartyEmotes);
        authorEl.textContent = 'PseudoTest';
        pinnedByEl.textContent = 'par Modérateur';
        if (timestampEl) timestampEl.textContent = '• 29/08/2026 à 20:00';
        container.classList.remove('hidden');
      }
    }
  });
});

function applyCustomStyle(style) {
  if (!style) return;

  // Sélection de la carte principale
  const card = document.querySelector('.pinned-card') || document.getElementById('pinned-container');
  const authorEl = document.getElementById('author-name');
  const textEl = document.getElementById('message-text');
  const pinnedByEl = document.getElementById('pinned-by');
  const timestampEl = document.getElementById('pinned-timestamp');
  const pinIcon = document.querySelector('.pin-icon');

  // 1. Couleur de la bordure gauche (#cc0000) et de l'icône Pin
  if (style.accentColor) {
    if (card) {
      card.style.borderLeftColor = style.accentColor;
    }
    if (pinIcon) {
      pinIcon.style.color = style.accentColor;
      pinIcon.style.fill = style.accentColor;
    }
  }

  // 2. Couleur de fond de la carte
  if (card && style.bgColor) {
    card.style.backgroundColor = style.bgColor;
  }

  // 3. Couleur des textes d'informations (MESSAGE ÉPINGLÉ, modérateur, date)
  if (style.metaColor) {
    const metaLabels = document.querySelectorAll('.meta-label, .pinned-header, #pinned-by, #pinned-timestamp');
    metaLabels.forEach(el => el.style.color = style.metaColor);
  }

  // 4. Couleur du pseudo et du texte principal
  if (authorEl && style.authorColor) authorEl.style.color = style.authorColor;
  if (textEl && style.textColor) textEl.style.color = style.textColor;
  if (textEl && style.fontSize) textEl.style.fontSize = `${style.fontSize}px`;

  // 5. Visibilité des éléments
  if (authorEl) authorEl.style.display = style.showAuthor ? 'block' : 'none';
  if (pinnedByEl) pinnedByEl.style.display = style.showPinnedBy ? 'inline' : 'none';
  if (timestampEl) timestampEl.style.display = style.showTimestamp ? 'inline' : 'none';

  // 6. Redimensionnement de l'iframe dans la prévisualisation Admin
  if (window.location.search.includes('preview=true')) {
    setTimeout(() => {
      const height = document.body.scrollHeight;
      window.parent.postMessage({ type: 'PREVIEW_HEIGHT', height }, '*');
    }, 50);
  }
}

function renderFragments(fragments, emoteMap) {
  return fragments.map(fragment => {
    if (fragment.type === 'emote' && fragment.emote?.id) {
      const emoteUrl = `https://static-cdn.jtvnw.net/emoticons/v2/${fragment.emote.id}/default/dark/2.0`;
      return `<img class="twitch-emote" src="${emoteUrl}" alt="${escapeHtml(fragment.text)}" />`;
    }

    if (fragment.text) {
      const lines = fragment.text.split('\n');
      return lines.map(line => {
        const words = line.split(' ');
        return words.map(word => {
          const cleanWord = word.trim();
          if (emoteMap.has(cleanWord)) {
            const url = emoteMap.get(cleanWord);
            return `<img class="twitch-emote" src="${url}" alt="${escapeHtml(cleanWord)}" />`;
          }
          return escapeHtml(word);
        }).join(' ');
      }).join('<br>');
    }

    return '';
  }).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
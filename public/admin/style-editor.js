document.addEventListener('DOMContentLoaded', async () => {
  const iframe = document.getElementById('overlay-preview');
  const fontSizeVal = document.getElementById('font-size-val');

  // 1. Chargement initial du style sauvegardé
  try {
    const res = await fetch('/api/style');
    if (res.ok) {
      const savedStyle = await res.json();
      applyConfigToInputs(savedStyle);
    }
  } catch (err) {
    console.error('[Editor] Erreur de chargement du style :', err);
  }

  // 2. Écouteurs sur les champs pour la mise à jour temps réel
  const inputs = document.querySelectorAll('.controls-panel input');
  inputs.forEach(input => {
    input.addEventListener('input', () => {
      if (input.id === 'cfg-font-size') {
        fontSizeVal.textContent = input.value;
      }
      updatePreview();
    });
  });

  // 3. Sauvegarde
  document.getElementById('btn-save-style').addEventListener('click', async () => {
    const config = getFormConfig();
    try {
      const res = await fetch('/api/style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) alert('Style sauvegardé avec succès !');
    } catch (err) {
      alert('Erreur lors de la sauvegarde.');
    }
  });

  // 4. Réinitialisation
  document.getElementById('btn-reset-style').addEventListener('click', async () => {
    if (!confirm('Voulez-vous vraiment remettre le style par défaut ?')) return;

    try {
      const res = await fetch('/api/style/reset', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        applyConfigToInputs(data.style);
        updatePreview();
      }
    } catch (err) {
      alert('Erreur lors de la réinitialisation.');
    }
  });

  function updatePreview() {
    const config = getFormConfig();
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: 'PREVIEW_STYLE', config }, '*');
    }
  }

  function getFormConfig() {
    return {
      testText: document.getElementById('cfg-test-text').value,
      bgColor: document.getElementById('cfg-bg-color').value,
      textColor: document.getElementById('cfg-text-color').value,
      authorColor: document.getElementById('cfg-author-color').value,
      accentColor: document.getElementById('cfg-accent-color').value,
      metaColor: document.getElementById('cfg-meta-color').value,
      fontSize: document.getElementById('cfg-font-size').value,
      showAuthor: document.getElementById('cfg-show-author').checked,
      showPinnedBy: document.getElementById('cfg-show-pinnedby').checked,
      showTimestamp: document.getElementById('cfg-show-timestamp').checked
    };
  }

  function applyConfigToInputs(config) {
    if (!config) return;

    if (config.testText !== undefined) document.getElementById('cfg-test-text').value = config.testText;
    if (config.bgColor) document.getElementById('cfg-bg-color').value = config.bgColor;
    if (config.textColor) document.getElementById('cfg-text-color').value = config.textColor;
    if (config.authorColor) document.getElementById('cfg-author-color').value = config.authorColor;
    if (config.accentColor) document.getElementById('cfg-accent-color').value = config.accentColor;
    if (config.metaColor) document.getElementById('cfg-meta-color').value = config.metaColor;
    if (config.fontSize) {
      document.getElementById('cfg-font-size').value = config.fontSize;
      if (fontSizeVal) fontSizeVal.textContent = config.fontSize;
    }

    if (config.showAuthor !== undefined) document.getElementById('cfg-show-author').checked = config.showAuthor;
    if (config.showPinnedBy !== undefined) document.getElementById('cfg-show-pinnedby').checked = config.showPinnedBy;
    if (config.showTimestamp !== undefined) document.getElementById('cfg-show-timestamp').checked = config.showTimestamp;

    iframe.onload = () => updatePreview();
    updatePreview();
  }
});
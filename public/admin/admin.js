document.addEventListener('DOMContentLoaded', async () => {
  const loginBtn = document.getElementById('login-twitch-btn');
  const statusText = document.getElementById('status-text');
  const copyBtn = document.getElementById('copy-btn');

  // Récupérer le nom de la chaîne depuis l'API local
  const res = await fetch('/api/status');
  const status = await res.json();
  
  if (status.authenticated && status.broadcasterName) {
    statusText.textContent = `Connecté en tant que : ${status.broadcasterName}`;
    statusText.style.color = '#00f59b';
    loginBtn.textContent = 'Reconnecter le compte Twitch';
  } else {
    statusText.textContent = 'Non connecté';
    statusText.style.color = '#ff4f4f';
  }

  loginBtn.addEventListener('click', () => {
    window.location.href = '/auth/twitch';
  });

  copyBtn.addEventListener('click', () => {
    const urlInput = document.getElementById('overlay-url');
    urlInput.select();
    navigator.clipboard.writeText(urlInput.value);
    alert('URL copiée dans le presse-papier !');
  });
});
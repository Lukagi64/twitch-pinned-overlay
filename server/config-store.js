const fs = require('fs');
const path = require('path');

/**
 * Stocke et lit la configuration dans le dossier système sécurisé de l'utilisateur.
 * Évite l'utilisation d'un fichier .env lisible par l'utilisateur.
 */
class ConfigStore {
  constructor(userDataPath) {
    this.configPath = path.join(userDataPath, 'twitch_overlay_config.json');
    this.data = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const rawData = fs.readFileSync(this.configPath, 'utf-8');
        return JSON.parse(rawData);
      }
    } catch (err) {
      console.error('Erreur lors de la lecture de la configuration :', err);
    }
    return {
      clientId: '',
      clientSecret: '',
      accessToken: '',
      refreshToken: '',
      broadcasterId: '',
      port: 3000
    };
  }

  saveConfig(newData) {
    this.data = { ...this.data, ...newData };
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de la configuration :', err);
    }
  }

  get(key) {
    return this.data[key];
  }

  getAll() {
    return this.data;
  }
}

module.exports = ConfigStore;
# 📌 Twitch Pinned Message Overlay

Un overlay léger, moderne et autonome développé avec Electron et Express pour afficher en direct les messages épinglés du chat Twitch sur **OBS Studio**.

![Twitch](https://img.shields.io/badge/Twitch-API%20Helix-9146FF?style=flat-square&logo=twitch&logoColor=white)
![Electron](https://img.shields.io/badge/Electron-31.x-47848F?style=flat-square&logo=electron&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.x-000000?style=flat-square&logo=express&logoColor=white)

---

## 🚀 Fonctionnalités

* **Intégration Twitch Helix REST API** : Interroge directement l'endpoint officiel (`GET /chat/pins`) pour une fiabilité maximale.
* **Transmission Temps Réel** : Communication ultra-rapide entre l'application et OBS grâce aux Server-Sent Events (SSE).
* **Design Moderne** : Style inspiré du thème sombre Twitch, translucide avec effet *backdrop-filter* et animations fluides.
* **Interface Administrateur** : Authentification OAuth2 en un clic et suivi du statut de la connexion.
* **Prêt pour OBS Studio** : Fond transparent pris en charge nativement via une source Navigateur.

---

## 🛠️ Installation & Utilisation

### Télécharger l'exécutable (Recommandé pour les Streamers)
1. Télécharge la dernière version dans la section [Releases](../../releases).
2. Lance l'application `Twitch Pinned Overlay Setup.exe`.
3. Clique sur **Se connecter avec Twitch** pour autoriser la lecture de tes messages épinglés.

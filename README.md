# Fluxo — Marketplace entre particuliers

Projet de fin d'études (PFE). Fluxo est une marketplace complète de vente entre
particuliers, déclinée en deux applications qui partagent la même base de données :

- Site web : PHP 8 + MySQL + Bootstrap 5 — dossier `vente_entre_particuliers/`
- Application mobile : React Native (Expo SDK 54) — dossier `fluxo-mobile/`

Les deux consomment les mêmes données : le site web est rendu côté serveur (PHP),
et l'application mobile communique avec une API REST en PHP (dossier `vente_entre_particuliers/api/`).
Le site web, l'application mobile et l'API pointent tous vers la même base MySQL (14 tables).

---

## 1. Stack technique

Site web (`vente_entre_particuliers/`) :

- PHP 8 (PDO, requêtes préparées)
- MySQL / MariaDB (via WAMP)
- Bootstrap 5.3 et Bootstrap Icons (CDN)
- JavaScript natif (favoris AJAX, messagerie temps réel, recalcul checkout)
- Stripe PHP SDK — paiement en ligne
- PHPMailer — envoi d'emails (SMTP Gmail)

Application mobile (`fluxo-mobile/`) :

- React Native + Expo (SDK 54) + TypeScript
- expo-router — navigation par fichiers
- AsyncStorage — session locale et annonces récemment vues
- expo-notifications — notifications locales
- expo-location et react-native-maps — géolocalisation des annonces
- expo-image-picker — upload de photos
- react-native-svg — graphiques du dashboard

Services / API externes :

- Stripe — paiement par carte et webhook de confirmation
- Gmail SMTP (via PHPMailer) — vérification email et réinitialisation de mot de passe

---

## 2. Bibliothèques utilisées

Site web — dépendances PHP (Composer) :

- stripe/stripe-php — SDK officiel Stripe (sessions de paiement, webhooks)
- phpmailer/phpmailer — envoi d'emails via SMTP (Gmail)

Site web — bibliothèques front (CDN) :

- Bootstrap — mise en page responsive et composants UI
- Bootstrap Icons — icônes

Le reste du front web est en JavaScript natif (pas de framework JS) : favoris en AJAX,
messagerie en temps réel (polling), recalcul des frais au checkout.

Application mobile — dépendances (npm) :

- expo — framework / runtime React Native
- react-native et react — base de l'application mobile
- expo-router — navigation par fichiers
- @react-navigation/native et bottom-tabs — navigation et onglets
- @react-native-async-storage/async-storage — stockage local (session, annonces récemment vues)
- expo-notifications — notifications locales
- expo-location — géolocalisation
- react-native-maps — cartes (sélection de position)
- react-native-svg — graphiques du dashboard
- expo-image — affichage optimisé des images
- expo-image-picker — choix de photos (galerie / caméra)
- expo-linking — liens profonds (deep links)
- expo-web-browser — ouverture du paiement Stripe
- expo-constants — lecture de la configuration (détection de l'IP)
- expo-haptics — retour haptique
- react-native-reanimated et react-native-gesture-handler — animations et gestes
- react-native-safe-area-context et react-native-screens — zones sûres et écrans natifs
- @expo/vector-icons — icônes (Ionicons, Feather, etc.)

---

## 3. Fonctionnalités

Visiteur (non connecté) :

- Parcourir les annonces, recherche avancée (mots-clés, synonymes, filtres ville/catégorie/marque/prix/tri)
- Voir le détail d'une annonce et le profil d'un vendeur (avec note moyenne)

Utilisateur connecté :

- Inscription avec vérification email par code
- Connexion / déconnexion, mot de passe oublié (lien par email)
- Favoris (ajout/retrait en AJAX)
- Messagerie entre acheteur et vendeur (temps réel sur le web via polling)
- Notifications (cloche et popup) : nouveau message, commande, statut de livraison, etc.
- Panier et paiement Stripe (livraison ou main propre, frais calculés selon la ville)
- Suivi de commande et historique
- Laisser un avis (note et commentaire) après achat
- Signaler une annonce

Vendeur :

- Publier / modifier / supprimer une annonce (photos, catégorie, marque, mode de vente, livraison, géolocalisation)
- Dashboard : total des ventes, commandes, articles vendus, vues, note moyenne, favoris reçus, annonces actives, graphique des revenus sur 30 jours, top annonces
- Gérer le statut de livraison des commandes reçues

Administrateur :

- Valider / refuser les annonces
- Gérer les utilisateurs (rôle, blocage)
- Traiter les signalements
- Voir toutes les commandes

Spécificités :

- Recommandé pour toi : suggestions basées sur les catégories/marques des favoris
- Récemment vues : sur le web (session) et sur mobile (stockage local)
- Modes de vente : paiement direct, contact vendeur, ou les deux

---

## 4. Architecture — comment chaque partie fonctionne

Authentification :

- Mots de passe hachés avec password_hash() (PHP) et vérifiés avec password_verify().
- Vérification email : un code est envoyé par email à l'inscription (table user.email_verifie).
- Reset mot de passe : un token aléatoire (bin2hex(random_bytes(32))) est haché en SHA-256 et stocké en base avec une expiration (1 h). Le lien envoyé par email contient le token en clair ; la page le re-hache pour le comparer.
- Web : session PHP. Mobile : utilisateur stocké en AsyncStorage.

Paiement (Stripe) :

- À la validation du panier, actions/stripe_create_session.php crée une session Stripe Checkout.
- L'utilisateur paie sur la page Stripe, puis revient sur stripe_success.php ou stripe_cancel.php.
- webhook_stripe.php reçoit l'événement Stripe (paiement confirmé) et met à jour la commande/paiement de façon fiable côté serveur.
- Clés stockées dans config/stripe.php (non versionné).

Messagerie temps réel (web) :

- Les messages sont en base (table message).
- La page messages.php interroge messages_poll.php toutes les 3 secondes (polling AJAX) : les nouveaux messages s'affichent sans rafraîchir et sont marqués comme lus.
- L'envoi passe par message_send_ajax.php (pas de rechargement de page).

Notifications :

- Table notification (type_notification, is_read, is_popup_seen).
- Web : la cloche affiche le nombre de non-lus ; ouvrir Messages / Ventes / Commandes marque les notifs de la catégorie comme lues, donc le total baisse.
- Mobile : un contexte React (notifications-context.tsx) interroge l'API toutes les 5 secondes, affiche une bannière, déclenche une notification locale (expo-notifications) et gère les badges par catégorie dans le menu.

Dashboard vendeur :

- api/dashboard.php agrège les ventes (jointures orders / order_details / paiement), détecte dynamiquement les colonnes existantes, et renvoie les stats et les données du graphique.
- Mobile : graphique dessiné avec react-native-svg (courbe 30 jours et barres du top annonces).

Recherche et recommandations :

- Recherche pondérée par score de pertinence (titre, puis marque, catégorie, ville, description) avec gestion de synonymes (ex : « pc » et « ordinateur »).
- Recommandations : api/recommended_mobile.php se base sur les catégories/marques des favoris, avec repli sur les plus populaires.

---

## 5. Structure du projet

Site web — `vente_entre_particuliers/` :

- index.php — accueil, recherche et listing
- annonce.php et publier.php — détail et publication d'annonce
- panier.php et checkout.php — panier et paiement
- messages.php — messagerie temps réel
- dashboard_vendeur.php — tableau de bord vendeur
- config/ — db.php, auth.php, mail.php, stripe.php (secrets, non versionnés)
- actions/ — traitements POST (login, publier, paiement, etc.)
- api/ — API REST consommée par le mobile
- admin/ — back-office administrateur
- includes/ — header, navbar, footer
- uploads/ — images (non versionnées)

Application mobile — `fluxo-mobile/` :

- app/ — écrans (expo-router), dont (tabs)/ pour les onglets, annonce/[id].tsx, dashboard.tsx, etc.
- config/api.ts — détection automatique de l'IP du serveur
- context/ — contexte des notifications
- utils/ — authentification et annonces récemment vues

---

## 6. Base de données (14 tables)

- user — comptes (rôle USER/ADMIN, email vérifié, token reset, statut)
- annonce — annonces (prix, ville, stock, mode de vente, catégorie, marque, vues, géoloc, livraison)
- annonce_image — photos secondaires d'une annonce
- favoris — favoris (utilisateur et annonce)
- historique_recherche — historique des recherches
- message — messages entre utilisateurs (lu / non lu)
- notification — notifications (type, lu, popup vu)
- orders — commandes (acheteur, statut, vu vendeur/acheteur)
- order_details — lignes de commande (annonce, quantité, prix)
- paiement — paiements liés aux commandes (statut)
- panier et panier_item — panier et ses articles
- review — avis sur les vendeurs (note et commentaire)
- signalement — signalements d'annonces

---

## 7. Installation

Prérequis :

- WAMP (Apache + PHP 8 + MySQL) ou équivalent
- Composer (dépendances PHP)
- Node.js et Expo CLI (pour le mobile)

A. Site web :

1. Placer le projet dans www/ (ex : C:\wamp64\www\pfe_fluxo).
2. Importer la base de données dans phpMyAdmin (créer la base "vente_particuliers").
3. Installer les dépendances PHP :

```
cd vente_entre_particuliers
composer install
```

4. Créer les fichiers de configuration (secrets) à partir des exemples :

```
cp config/stripe.example.php config/stripe.php
cp config/mail_secret.example.php config/mail_secret.php
```

Puis renseigner les clés Stripe et les identifiants SMTP Gmail.
(db.php utilise des variables d'environnement avec des valeurs locales par défaut.)

Accès : http://localhost/pfe_fluxo/vente_entre_particuliers/

B. Application mobile :

```
cd fluxo-mobile
npm install
npx expo start -c
```

Scanner le QR code avec Expo Go (téléphone sur le même wifi que le PC).
L'IP du serveur est détectée automatiquement (config/api.ts), pas besoin de la coder en dur.

---

## 8. API REST (pour le mobile)

Toutes les routes sont dans vente_entre_particuliers/api/ et renvoient du JSON.

Authentification :

- login_mobile.php, register_mobile.php, verify_email_mobile.php, forgot_password_mobile.php, reset_password_mobile.php

Annonces :

- annonces.php, annonce_details.php, publier_mobile.php, annonce_edit_mobile_save.php, annonce_delete_mobile.php, recommended_mobile.php

Favoris :

- favoris.php, favori_toggle.php

Panier et achat :

- panier_mobile.php, panier_add_mobile.php, buy_now_mobile.php, checkout_mobile.php, create_checkout_session.php

Commandes et ventes :

- mes_commandes_mobile.php, mes_ventes_mobile.php, commande_details_mobile.php, vendor_order_status_mobile.php, suivi_commande_mobile.php

Messages :

- messages_list.php, messages_thread.php, messages_send.php

Notifications :

- notifications_mobile.php, notifications_poll_mobile.php, notifications_mark_read_mobile.php, notifications_seen_mobile.php

Profil et avis :

- profile_mobile.php, profile_update_mobile.php, password_update_mobile.php, avis_mobile.php, laisser_avis_mobile.php, vendeur_details.php

Dashboard :

- dashboard.php

---

## 9. Sécurité

- Mots de passe hachés (password_hash)
- Requêtes préparées (PDO) contre les injections SQL
- Échappement HTML (htmlspecialchars) contre le XSS
- Token de reset haché (SHA-256) avec expiration
- Secrets (Stripe, SMTP) hors du dépôt (.gitignore)
- Accès admin protégé (requireAdmin)

---

## 10. Notes et limitations

- Messagerie web : temps réel via polling (3 s), pas de WebSocket — choix adapté à un hébergement PHP/WAMP classique.
- Notifications mobile : notifications locales (Expo Go). Le vrai push serveur nécessiterait un development build.
- Checkout : un seul vendeur par commande (simplification PFE).
- Avant une mise en production réelle : passer en HTTPS et régénérer les clés/secrets.

---

Projet réalisé dans le cadre d'un PFE — marketplace web et mobile « Fluxo ».

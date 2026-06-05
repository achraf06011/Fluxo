# Fluxo — Marketplace entre particuliers

Projet de fin d'études (PFE). **Fluxo** est une marketplace complète de vente entre
particuliers, déclinée en **deux applications qui partagent la même base de données** :

| Application | Technologie | Dossier |
|-------------|-------------|---------|
| 🌐 **Site web** | PHP 8 + MySQL + Bootstrap 5 | `vente_entre_particuliers/` |
| 📱 **Application mobile** | React Native (Expo SDK 54) | `fluxo-mobile/` |

Les deux consomment les mêmes données : le site web est rendu côté serveur (PHP),
l'application mobile communique avec une **API REST en PHP** (dossier `vente_entre_particuliers/api/`).

```
                     ┌─────────────────────┐
   Site web (PHP) ───▶                     │
                     │   Base MySQL        │
   App mobile  ──────▶   (14 tables)       │
   (REST API PHP) ───▶                     │
                     └─────────────────────┘
```

---

## 1. Stack technique

### Site web (`vente_entre_particuliers/`)
- **PHP 8** (PDO, requêtes préparées)
- **MySQL / MariaDB** (via WAMP)
- **Bootstrap 5.3** + **Bootstrap Icons** (CDN)
- **JavaScript vanilla** (favoris AJAX, messagerie temps réel, recalcul checkout)
- **Stripe PHP SDK** — paiement en ligne
- **PHPMailer** — envoi d'emails (SMTP Gmail)

### Application mobile (`fluxo-mobile/`)
- **React Native 0.81** + **Expo SDK 54** + **TypeScript**
- **expo-router** — navigation par fichiers (file-based routing)
- **AsyncStorage** — session locale + annonces récemment vues
- **expo-notifications** — notifications locales
- **expo-location** + **react-native-maps** — géolocalisation des annonces
- **expo-image-picker** — upload de photos
- **react-native-svg** — graphiques du dashboard

### Services / API externes
| Service | Usage |
|---------|-------|
| **Stripe** | Paiement par carte + webhook de confirmation |
| **Gmail SMTP** (via PHPMailer) | Vérification email + réinitialisation de mot de passe |

---

## 2. Fonctionnalités

### 👤 Visiteur (non connecté)
- Parcourir les annonces, recherche avancée (mots-clés, **synonymes**, filtres ville/catégorie/marque/prix/tri)
- Voir le détail d'une annonce et le profil d'un vendeur (avec note moyenne)

### 🔐 Utilisateur connecté
- Inscription avec **vérification email par code**
- Connexion / déconnexion, **mot de passe oublié** (lien par email)
- **Favoris** (ajout/retrait en AJAX)
- **Messagerie** entre acheteur et vendeur (**temps réel** sur le web via polling)
- **Notifications** (cloche + popup) : nouveau message, commande, statut de livraison…
- **Panier** + **paiement Stripe** (livraison ou main propre, frais calculés selon la ville)
- **Suivi de commande** et historique
- **Laisser un avis** (note + commentaire) après achat
- **Signaler** une annonce

### 🏪 Vendeur
- **Publier / modifier / supprimer** une annonce (photos, catégorie, marque, mode de vente, livraison, géolocalisation)
- **Dashboard** : total des ventes, commandes, articles vendus, **vues**, **note moyenne**, **favoris reçus**, annonces actives, **graphique des revenus sur 30 jours**, top annonces
- Gérer le **statut de livraison** des commandes reçues

### 🛡️ Administrateur
- **Valider / refuser** les annonces
- Gérer les **utilisateurs** (rôle, blocage)
- Traiter les **signalements**
- Voir toutes les **commandes**

### 🤝 Spécificités
- **Recommandé pour toi** : suggestions basées sur les catégories/marques des favoris
- **Récemment vues** : sur le web (session) et sur mobile (stockage local)
- **Modes de vente** : paiement direct, contact vendeur, ou les deux

---

## 3. Architecture — comment chaque partie fonctionne

### 🔑 Authentification
- Mots de passe hachés avec `password_hash()` (PHP) / vérifiés avec `password_verify()`.
- **Vérification email** : un code est envoyé par email à l'inscription (table `user.email_verifie`).
- **Reset mot de passe** : un token aléatoire (`bin2hex(random_bytes(32))`) est **haché en SHA-256** et stocké en base avec une expiration (1 h). Le lien envoyé par email contient le token en clair ; la page le re-hache pour le comparer.
- Web : session PHP (`$_SESSION["user"]`). Mobile : utilisateur stocké en `AsyncStorage`.

### 💳 Paiement (Stripe)
- À la validation du panier, `actions/stripe_create_session.php` crée une **session Stripe Checkout**.
- L'utilisateur paie sur la page Stripe, puis revient sur `stripe_success.php` / `stripe_cancel.php`.
- `webhook_stripe.php` reçoit l'événement Stripe (paiement confirmé) et met à jour la commande/paiement de façon fiable côté serveur.
- Clés stockées dans `config/stripe.php` (non versionné).

### 💬 Messagerie temps réel (web)
- Les messages sont en base (table `message`).
- La page `messages.php` interroge `messages_poll.php` **toutes les 3 s** (polling AJAX) → les nouveaux messages s'affichent **sans rafraîchir**, et sont marqués comme lus.
- L'envoi passe par `message_send_ajax.php` (pas de rechargement de page).

### 🔔 Notifications
- Table `notification` (`type_notification`, `is_read`, `is_popup_seen`).
- Web : la cloche affiche le nombre de non-lus ; ouvrir Messages / Ventes / Commandes marque les notifs de la catégorie comme lues → le total baisse.
- Mobile : un **contexte React** (`notifications-context.tsx`) interroge l'API toutes les 5 s, affiche une **bannière** + déclenche une **notification locale** (expo-notifications), et gère les **badges par catégorie** dans le menu.

### 📊 Dashboard vendeur
- `api/dashboard.php` agrège les ventes (jointures `orders` / `order_details` / `paiement`), détecte dynamiquement les colonnes existantes, et renvoie stats + données du graphique.
- Mobile : graphique dessiné avec **react-native-svg** (courbe 30 jours + barres top annonces).

### 🔎 Recherche & recommandations
- Recherche pondérée par **score de pertinence** (titre > marque > catégorie > ville > description) avec gestion de **synonymes** (ex : « pc » ↔ « ordinateur »).
- Recommandations : `api/recommended_mobile.php` se base sur les catégories/marques des favoris, avec repli sur les plus populaires.

---

## 4. Structure du projet

```
pfe_fluxo/
├── vente_entre_particuliers/        # SITE WEB (PHP)
│   ├── index.php                    # accueil + recherche + listing
│   ├── annonce.php / publier.php    # détail / publication d'annonce
│   ├── panier.php / checkout.php    # panier + paiement
│   ├── messages.php                 # messagerie (temps réel)
│   ├── dashboard_vendeur.php        # tableau de bord vendeur
│   ├── config/                      # db.php, auth.php, mail.php, stripe.php*
│   ├── actions/                     # traitements POST (login, publier, paiement...)
│   ├── api/                         # API REST consommée par le mobile
│   ├── admin/                       # back-office administrateur
│   ├── includes/                    # header, navbar, footer
│   └── uploads/*                    # images (non versionnées)
│
└── fluxo-mobile/                    # APPLICATION MOBILE (React Native / Expo)
    ├── app/                         # écrans (expo-router)
    │   ├── (tabs)/                  # onglets (accueil…)
    │   ├── annonce/[id].tsx         # détail annonce
    │   ├── dashboard.tsx            # dashboard vendeur
    │   └── ...
    ├── config/api.ts                # détection auto de l'IP du serveur
    ├── context/                     # contexte notifications
    └── utils/                       # auth, récemment vues
```
`*` = fichiers ignorés par git (secrets / données locales).

---

## 5. Base de données (14 tables)

| Table | Rôle |
|-------|------|
| `user` | Comptes (rôle USER/ADMIN, email vérifié, token reset, statut) |
| `annonce` | Annonces (prix, ville, stock, mode de vente, catégorie, marque, vues, géoloc, livraison) |
| `annonce_image` | Photos secondaires d'une annonce |
| `favoris` | Favoris (utilisateur ↔ annonce) |
| `historique_recherche` | Historique des recherches |
| `message` | Messages entre utilisateurs (lu/non lu) |
| `notification` | Notifications (type, lu, popup vu) |
| `orders` | Commandes (acheteur, statut, vu vendeur/acheteur) |
| `order_details` | Lignes de commande (annonce, quantité, prix) |
| `paiement` | Paiements liés aux commandes (statut) |
| `panier` / `panier_item` | Panier et ses articles |
| `review` | Avis sur les vendeurs (note + commentaire) |
| `signalement` | Signalements d'annonces |

---


## 7. API REST (pour le mobile)

Toutes les routes sont dans `vente_entre_particuliers/api/` et renvoient du **JSON**.

| Domaine | Endpoints |
|---------|-----------|
| **Auth** | `login_mobile.php`, `register_mobile.php`, `verify_email_mobile.php`, `forgot_password_mobile.php`, `reset_password_mobile.php` |
| **Annonces** | `annonces.php`, `annonce_details.php`, `publier_mobile.php`, `annonce_edit_mobile_save.php`, `annonce_delete_mobile.php`, `recommended_mobile.php` |
| **Favoris** | `favoris.php`, `favori_toggle.php` |
| **Panier / Achat** | `panier_mobile.php`, `panier_add_mobile.php`, `buy_now_mobile.php`, `checkout_mobile.php`, `create_checkout_session.php` |
| **Commandes / Ventes** | `mes_commandes_mobile.php`, `mes_ventes_mobile.php`, `commande_details_mobile.php`, `vendor_order_status_mobile.php`, `suivi_commande_mobile.php` |
| **Messages** | `messages_list.php`, `messages_thread.php`, `messages_send.php` |
| **Notifications** | `notifications_mobile.php`, `notifications_poll_mobile.php`, `notifications_mark_read_mobile.php`, `notifications_seen_mobile.php` |
| **Profil / Avis** | `profile_mobile.php`, `profile_update_mobile.php`, `password_update_mobile.php`, `avis_mobile.php`, `laisser_avis_mobile.php`, `vendeur_details.php` |
| **Dashboard** | `dashboard.php` |

---

## 8. Sécurité

- ✅ Mots de passe **hachés** (`password_hash`)
- ✅ **Requêtes préparées** (PDO) contre les injections SQL
- ✅ Échappement HTML (`htmlspecialchars`) contre le XSS
- ✅ Token de reset **haché** (SHA-256) + expiration
- ✅ Secrets (Stripe, SMTP) **hors du dépôt** (`.gitignore`)
- ✅ Accès admin protégé (`requireAdmin()`)

---

## 9. Notes & limitations

- **Messagerie web** : temps réel via *polling* (3 s), pas de WebSocket — choix adapté à un hébergement PHP/WAMP classique.
- **Notifications mobile** : notifications **locales** (Expo Go). Le vrai *push serveur* nécessiterait un *development build*.
- **Checkout** : un seul vendeur par commande (simplification PFE).
- Avant une mise en production réelle : passer en **HTTPS** et régénérer les clés/secrets.

---

*Projet réalisé dans le cadre d'un PFE — marketplace web & mobile « Fluxo ».*

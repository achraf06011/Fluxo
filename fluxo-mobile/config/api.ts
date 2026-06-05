import Constants from "expo-constants";

/**
 * Récupère automatiquement l'IP du PC qui lance le serveur Expo (Metro).
 * Quand tu changes de wifi, l'IP change : on la relit ici, donc plus besoin
 * de modifier le code à chaque fois.
 *
 * En production (build standalone, sans Metro), on retombe sur l'URL définie
 * dans app.json -> expo.extra.apiHost si elle existe.
 */
function getDevHost(): string {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    // anciennes versions / autres modes d'Expo Go
    (Constants as any).manifest?.debuggerHost ||
    (Constants as any).manifest2?.extra?.expoGo?.debuggerHost ||
    "";

  // hostUri ressemble à "192.168.1.13:8081" -> on garde juste l'IP
  const host = String(hostUri).split(":")[0];

  if (host) return host;

  // Fallback (build sans Metro, ou détection impossible)
  const fallback = (Constants.expoConfig?.extra as any)?.apiHost;
  return fallback || "192.168.1.13";
}

const HOST = getDevHost();

/** Base du site PHP (pour les images, liens web, etc.) */
export const WEB_BASE = `http://${HOST}/pfe_fluxo/vente_entre_particuliers`;

/** Base des endpoints API */
export const API_BASE = `${WEB_BASE}/api`;

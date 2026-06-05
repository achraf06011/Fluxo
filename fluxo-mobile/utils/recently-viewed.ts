import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "recently_viewed_annonces";
const MAX = 10;

export type RecentItem = {
  id_annonce: number;
  titre: string;
  prix: number | string;
  ancien_prix?: number | string | null;
  ville?: string | null;
  mode_vente?: string | null;
  cover_url?: string | null;
};

/** Ajoute une annonce en tête de la liste "récemment vues" (dédupliquée, max 10). */
export async function addRecentlyViewed(item: RecentItem): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    let list: RecentItem[] = raw ? JSON.parse(raw) : [];

    list = list.filter(
      (x) => Number(x.id_annonce) !== Number(item.id_annonce)
    );
    list.unshift(item);

    if (list.length > MAX) list = list.slice(0, MAX);

    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // stockage local indisponible : on ignore
  }
}

export async function getRecentlyViewed(): Promise<RecentItem[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentItem[]) : [];
  } catch {
    return [];
  }
}

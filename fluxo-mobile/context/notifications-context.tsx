import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { getUser } from "../utils/auth";

import { API_BASE } from "@/config/api";

// Affiche la notification même quand l'app est ouverte (premier plan)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function fireLocalNotification(title: string, body: string) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title: title || "Fluxo", body: body || "" },
      trigger: null, // immédiat
    });
  } catch {
    // notifications indisponibles (ex : Expo Go limité) : on ignore
  }
}

type PopupNotification = {
  id_notification: number;
  type_notification: string;
  titre: string;
  contenu: string;
  lien: string;
  mobile_route: string;
  is_read: number;
  is_popup_seen: number;
  created_at: string;
  icon: string;
  icon_color: string;
  icon_bg: string;
};

type NotificationsContextType = {
  badgeCount: number;
  badgeMessages: number;
  badgeVentes: number;
  badgeCommandes: number;
  popup: PopupNotification | null;
  popupVisible: boolean;
  closePopup: () => Promise<void>;
  openPopup: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markCategoryRead: (
    category: "messages" | "ventes" | "commandes"
  ) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextType>({
  badgeCount: 0,
  badgeMessages: 0,
  badgeVentes: 0,
  badgeCommandes: 0,
  popup: null,
  popupVisible: false,
  closePopup: async () => {},
  openPopup: async () => {},
  refreshNotifications: async () => {},
  markCategoryRead: async () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const [badgeCount, setBadgeCount] = useState(0);
  const [badgeMessages, setBadgeMessages] = useState(0);
  const [badgeVentes, setBadgeVentes] = useState(0);
  const [badgeCommandes, setBadgeCommandes] = useState(0);
  const [popup, setPopup] = useState<PopupNotification | null>(null);
  const [popupVisible, setPopupVisible] = useState(false);
  const [userId, setUserId] = useState<number>(0);

  const shownPopupIdRef = useRef<number>(0);

  const markPopupSeen = useCallback(
    async (id: number) => {
      if (!userId || !id) return;

      try {
        await fetch(`${API_BASE}/notifications_seen_mobile.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            user_id: Number(userId),
            id_notification: Number(id),
          }),
        });
      } catch {}
    },
    [userId]
  );

  const refreshNotifications = useCallback(async () => {
    try {
      const currentUser = await getUser();
      const uid = Number(currentUser?.id_user || 0);

      setUserId(uid);

      if (!uid) {
        setBadgeCount(0);
        setBadgeMessages(0);
        setBadgeVentes(0);
        setBadgeCommandes(0);
        setPopup(null);
        setPopupVisible(false);
        shownPopupIdRef.current = 0;
        return;
      }

      const res = await fetch(
        `${API_BASE}/notifications_poll_mobile.php?user_id=${uid}`,
        {
          headers: {
            Accept: "application/json",
          },
        }
      );

      const rawText = await res.text();
      if (!rawText || rawText.trim() === "") return;

      let data: any = null;

      try {
        data = JSON.parse(rawText);
      } catch {
        return;
      }

      if (!data.ok) return;

      setBadgeCount(Number(data.badge || 0));
      setBadgeMessages(Number(data.counts?.messages || 0));
      setBadgeVentes(Number(data.counts?.ventes || 0));
      setBadgeCommandes(Number(data.counts?.commandes || 0));

      if (
        data.popup &&
        Number(data.popup.id_notification || 0) > 0 &&
        Number(data.popup.id_notification) !== shownPopupIdRef.current
      ) {
        const isFirstRun = shownPopupIdRef.current === 0;
        shownPopupIdRef.current = Number(data.popup.id_notification);
        setPopup(data.popup);
        setPopupVisible(true);

        // Notification locale (OS) — seulement pour les nouvelles arrivées,
        // pas pour une notif déjà présente au lancement de l'app.
        if (!isFirstRun) {
          fireLocalNotification(data.popup.titre, data.popup.contenu);
        }
      }
    } catch {}
  }, []);

  // Demande la permission de notification une fois au démarrage
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        if (status !== "granted") {
          await Notifications.requestPermissionsAsync();
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    refreshNotifications();

    const interval = setInterval(() => {
      refreshNotifications();
    }, 5000);

    return () => clearInterval(interval);
  }, [refreshNotifications]);

  const markCategoryRead = useCallback(
    async (category: "messages" | "ventes" | "commandes") => {
      try {
        const currentUser = await getUser();
        const uid = Number(currentUser?.id_user || 0);
        if (!uid) return;

        await fetch(`${API_BASE}/notifications_mark_read_mobile.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ user_id: uid, category }),
        });

        await refreshNotifications();
      } catch {}
    },
    [refreshNotifications]
  );

  const closePopup = useCallback(async () => {
    if (popup?.id_notification) {
      await markPopupSeen(Number(popup.id_notification));
    }

    setPopupVisible(false);
    setPopup(null);
    await refreshNotifications();
  }, [popup, markPopupSeen, refreshNotifications]);

  const openPopup = useCallback(async () => {
    if (!popup) return;

    const route = popup.mobile_route || "/notifications";
    const notifId = Number(popup.id_notification || 0);

    if (notifId > 0) {
      await markPopupSeen(notifId);
    }

    setPopupVisible(false);
    setPopup(null);

    if (route === "/messages") {
      router.push("/messages");
    } else if (route === "/mes-commandes") {
      router.push("/mes-commandes");
    } else if (route === "/mes-ventes") {
      router.push("/mes-ventes");
    } else if (route === "/mes-annonces") {
      router.push("/mes-annonces");
    } else if (route === "/mon-compte") {
      router.push("/mon-compte");
    } else if (route.startsWith("/annonce/")) {
      router.push(route as any);
    } else if (route.startsWith("/commande/")) {
      router.push(route as any);
    } else if (route.startsWith("/vente/")) {
      router.push(route as any);
    } else {
      router.push("/notifications");
    }

    await refreshNotifications();
  }, [popup, markPopupSeen, router, refreshNotifications]);

  const value = useMemo(
    () => ({
      badgeCount,
      badgeMessages,
      badgeVentes,
      badgeCommandes,
      popup,
      popupVisible,
      closePopup,
      openPopup,
      refreshNotifications,
      markCategoryRead,
    }),
    [
      badgeCount,
      badgeMessages,
      badgeVentes,
      badgeCommandes,
      popup,
      popupVisible,
      closePopup,
      openPopup,
      refreshNotifications,
      markCategoryRead,
    ]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}
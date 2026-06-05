import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Feather, Ionicons } from "@expo/vector-icons";
import { getUser } from "../utils/auth";

import { WEB_BASE as API_BASE } from "@/config/api";

export default function FavorisScreen() {
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  async function loadFavoris() {
    try {
      setLoading(true);
      setErrorMsg("");

      const user = await getUser();

      if (!user) {
        setErrorMsg("Connexion requise.");
        setAnnonces([]);
        return;
      }

      const res = await fetch(
        `${API_BASE}/api/favoris.php?user_id=${Number(user.id_user)}`
      );
      const data = await res.json();

      if (!data.ok) {
        setErrorMsg(data.message || "Erreur chargement favoris");
        return;
      }

      setAnnonces(data.annonces || []);
    } catch (error: any) {
      setErrorMsg(String(error));
    } finally {
      setLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadFavoris();
    }, [])
  );

  async function toggleFavori(item: any) {
    const user = await getUser();

    if (!user) {
      Alert.alert("Connexion requise", "Tu dois te connecter.");
      router.push("/login");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/favori_toggle.php`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: Number(user.id_user),
          id_annonce: Number(item.id_annonce),
        }),
      });

      const data = await res.json();

      if (!data.ok) {
        Alert.alert("Erreur", data.message || "Erreur favoris.");
        return;
      }

      if (!data.favori) {
        setAnnonces((prev) =>
          prev.filter((x) => Number(x.id_annonce) !== Number(item.id_annonce))
        );
      }
    } catch {
      Alert.alert("Erreur", "Erreur serveur.");
    }
  }

  async function requireLoginBefore(action: () => void) {
    const user = await getUser();

    if (!user) {
      Alert.alert(
        "Connexion requise",
        "Tu dois te connecter pour continuer.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Connexion", onPress: () => router.push("/login") },
        ]
      );
      return;
    }

    action();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>Chargement...</Text>
      </View>
    );
  }

  if (errorMsg) {
    return (
      <View style={styles.center}>
        <Text style={styles.text}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Mes favoris</Text>

      <FlatList
        data={annonces}
        keyExtractor={(item) => String(item.id_annonce)}
        contentContainerStyle={{ paddingBottom: 30 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            style={styles.card}
            onPress={() => router.push(`/annonce/${item.id_annonce}`)}
          >
            <Image
              source={{
                uri: `${API_BASE}/uploads/${item.cover_image}`,
              }}
              style={styles.image}
              resizeMode="contain"
            />

            <View style={styles.cardBody}>
              <Text style={styles.title}>{item.titre}</Text>
              <Text style={styles.price}>{Number(item.prix).toFixed(2)} DH</Text>

              <View style={styles.metaInlineRow}>
                <View style={styles.metaInlineItem}>
                  <Feather name="map-pin" size={15} color="#6b7280" />
                  <Text style={styles.metaInlineText}>{item.ville}</Text>
                </View>

                <View style={styles.metaInlineItem}>
                  <Feather name="box" size={15} color="#6b7280" />
                  <Text style={styles.metaInlineText}>Stock: {item.stock}</Text>
                </View>
              </View>

              <View style={styles.buttons}>
                <TouchableOpacity
                  style={styles.btn}
                  onPress={() => router.push(`/annonce/${item.id_annonce}`)}
                >
                  <Text style={styles.btnText}>Voir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnBuy}
                  onPress={() =>
                    requireLoginBefore(() => {
                      Alert.alert("Achat", "La partie achat viendra juste après.");
                    })
                  }
                >
                  <Text style={styles.btnBuyText}>Acheter</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnMessage}
                  onPress={() =>
                    requireLoginBefore(() => {
                      router.push({
                        pathname: "/messages",
                        params: {
                          vendeur: item.vendeur_nom ?? "Vendeur",
                          annonceId: String(item.id_annonce),
                          titre: item.titre ?? "",
                          to: String(item.id_vendeur ?? 0),
                        },
                      });
                    })
                  }
                >
                  <Text style={styles.btnMessageText}>Message</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnHeart}
                  onPress={() => toggleFavori(item)}
                >
                  <Ionicons name="heart" size={18} color="#dc2626" />
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="heart-outline" size={34} color="#9ca3af" />
            <Text style={styles.emptyTitle}>Aucun favori</Text>
            <Text style={styles.emptyText}>
              Tu n’as pas encore ajouté d’annonce à tes favoris.
            </Text>
            <TouchableOpacity
              style={styles.exploreBtn}
              onPress={() => router.push("/")}
            >
              <Text style={styles.exploreBtnText}>Explorer les annonces</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  emptyCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 8,
    alignItems: "center",
  },
  emptyTitle: {
    marginTop: 10,
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
  exploreBtn: {
    marginTop: 16,
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  exploreBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
  },
  text: {
    fontSize: 16,
    color: "#111",
    textAlign: "center",
    marginBottom: 8,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 10,
    marginLeft: 15,
    color: "#111",
  },
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 10,
    marginTop: 10,
    borderRadius: 14,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: 180,
    backgroundColor: "#f8f9fa",
    padding: 8,
  },
  cardBody: {
    padding: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 2,
    color: "#111",
  },
  price: {
    fontSize: 18,
    color: "#2563eb",
    marginTop: 6,
    fontWeight: "700",
  },
  metaInlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  metaInlineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaInlineText: {
    color: "#6b7280",
    fontSize: 14,
  },
  buttons: {
    flexDirection: "row",
    marginTop: 4,
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  btn: {
    borderWidth: 1,
    borderColor: "#ccc",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  btnText: {
    color: "#111",
    fontWeight: "600",
  },
  btnBuy: {
    backgroundColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnBuyText: {
    color: "#fff",
    fontWeight: "700",
  },
  btnMessage: {
    borderWidth: 1,
    borderColor: "#2563eb",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  btnMessageText: {
    color: "#2563eb",
    fontWeight: "700",
  },
  btnHeart: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fca5a5",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
});
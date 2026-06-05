import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { getUser } from "../utils/auth";

import { API_BASE as API } from "@/config/api";

export default function CartScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadCart();
  }, []);

  async function loadCart() {
    try {
      const user = await getUser();

      if (!user) {
        Alert.alert("Erreur", "Utilisateur non connecté");
        return;
      }

      const res = await fetch(`${API}/get_cart.php?user_id=${user.id_user}`);
      const data = await res.json();

      if (!data.ok) {
        Alert.alert("Erreur", data.message || "Erreur panier");
        return;
      }

      setItems(data.items);

     
      let t = 0;
      data.items.forEach((it: any) => {
        t += Number(it.prix) * Number(it.quantity);
      });
      setTotal(t);

    } catch {
      Alert.alert("Erreur", "Impossible de charger le panier");
    } finally {
      setLoading(false);
    }
  }

  function goToCheckout() {
    if (items.length === 0) {
      Alert.alert("Panier vide");
      return;
    }

    router.push("/checkout");
  }

  const renderItem = ({ item }: any) => (
    <View style={styles.item}>
      <Text style={styles.title}>{item.titre}</Text>
      <Text style={styles.price}>
        {item.prix} MAD x {item.quantity}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: "Panier" }} />

      <View style={styles.container}>
        {items.length === 0 ? (
          <Text style={styles.empty}>Ton panier est vide</Text>
        ) : (
          <>
            <FlatList
              data={items}
              keyExtractor={(item) => item.id_annonce.toString()}
              renderItem={renderItem}
            />

            <View style={styles.footer}>
              <Text style={styles.total}>
                Total : {total.toFixed(2)} MAD
              </Text>

              <TouchableOpacity style={styles.btn} onPress={goToCheckout}>
                <Text style={styles.btnText}>Passer au paiement</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#fff",
  },
  item: {
    padding: 14,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
  },
  price: {
    marginTop: 4,
    color: "#555",
  },
  footer: {
    marginTop: 20,
  },
  total: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  btn: {
    backgroundColor: "#16a34a",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  empty: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 18,
    color: "#888",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
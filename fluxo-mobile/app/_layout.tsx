import React, { useEffect } from "react";
import { DefaultTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import "react-native-reanimated";
import {
  NotificationsProvider,
  useNotifications,
} from "../context/notifications-context";

export const unstable_settings = {
  anchor: "(tabs)",
};

function NotificationPopup() {
  const { popup, popupVisible, closePopup, openPopup } = useNotifications();

  // Disparition automatique après 5 secondes (comme une vraie notification)
  useEffect(() => {
    if (!popupVisible) return;
    const timer = setTimeout(() => {
      closePopup();
    }, 5000);
    return () => clearTimeout(timer);
  }, [popupVisible, closePopup]);

  if (!popupVisible) return null;

  return (
    // pointerEvents="box-none" => les touchers passent à travers,
    // sauf sur la carte elle-même => la navigation reste utilisable.
    <View style={styles.popupContainer} pointerEvents="box-none">
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.popupCard}
        onPress={openPopup}
      >
        <View
          style={[
            styles.popupIconWrap,
            { backgroundColor: popup?.icon_bg || "#f3f4f6" },
          ]}
        >
          <Ionicons
            name={(popup?.icon as any) || "notifications-outline"}
            size={18}
            color={popup?.icon_color || "#6b7280"}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={styles.popupTitle} numberOfLines={1}>
            {popup?.titre || "Nouvelle notification"}
          </Text>

          <Text style={styles.popupText} numberOfLines={2}>
            {popup?.contenu || ""}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.popupClose}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          onPress={(e) => {
            e.stopPropagation?.();
            closePopup();
          }}
        >
          <Ionicons name="close" size={18} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

function RootNavigator() {
  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: "#ffffff" },
          headerStyle: {
            backgroundColor: "#ffffff",
          },
          headerTintColor: "#111827",
          headerTitleStyle: {
            color: "#111827",
            fontWeight: "800",
          },
          headerShadowVisible: true,
          headerBackButtonDisplayMode: "minimal",
          headerBackTitle: "",
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="annonce/[id]"
          options={{ title: "Détail annonce" }}
        />
        <Stack.Screen name="messages" options={{ title: "Messages" }} />
        <Stack.Screen name="login" options={{ title: "Connexion" }} />
        <Stack.Screen name="register" options={{ title: "Inscription" }} />
        <Stack.Screen
          name="verifier-email"
          options={{ title: "Vérifier email" }}
        />
        <Stack.Screen
          name="forgot-password"
          options={{ title: "Mot de passe oublié" }}
        />
        <Stack.Screen
          name="reset-password"
          options={{ title: "Nouveau mot de passe" }}
        />
        <Stack.Screen name="favoris" options={{ title: "Favoris" }} />
        <Stack.Screen
          name="annonce-edit/[id]"
          options={{ title: "Modifier annonce" }}
        />
        <Stack.Screen name="publier" options={{ title: "Publier annonce" }} />
        <Stack.Screen name="panier" options={{ title: "Panier" }} />
        <Stack.Screen name="checkout" options={{ title: "Checkout" }} />
        <Stack.Screen name="dashboard" options={{ title: "Dashboard" }} />
        <Stack.Screen
          name="mes-commandes"
          options={{ title: "Mes commandes" }}
        />
        <Stack.Screen name="mes-ventes" options={{ title: "Mes ventes" }} />
        <Stack.Screen name="mes-annonces" options={{ title: "Mes annonces" }} />
        <Stack.Screen name="mon-compte" options={{ title: "Mon compte" }} />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications" }}
        />
        <Stack.Screen name="commande/[id]" options={{ title: "Commande" }} />
        <Stack.Screen
          name="suivi-commande/[id]"
          options={{ title: "Suivi commande" }}
        />
        <Stack.Screen
          name="laisser-avis"
          options={{ title: "Laisser un avis" }}
        />
        <Stack.Screen name="vente/[id]" options={{ title: "Vente" }} />
        <Stack.Screen
          name="menu"
          options={{
            presentation: "transparentModal",
            headerShown: false,
            animation: "fade",
          }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>

      <NotificationPopup />
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={DefaultTheme}>
      <NotificationsProvider>
        <RootNavigator />
      </NotificationsProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  popupContainer: {
    position: "absolute",
    top: 56,
    left: 10,
    right: 10,
    zIndex: 1000,
  },
  popupCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    shadowColor: "#000",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  popupClose: {
    padding: 2,
  },
  popupIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  popupTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1e3a8a",
  },
  popupText: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
    marginTop: 2,
  },
});

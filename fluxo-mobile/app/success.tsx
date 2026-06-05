import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export default function Success() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Ionicons name="checkmark-circle" size={72} color="#16a34a" />
      <Text style={{ fontSize: 22, fontWeight: "bold", marginTop: 12 }}>
        Paiement réussi
      </Text>
    </View>
  );
}

import { Image } from "expo-image";
import React from "react";
import { StyleSheet, View } from "react-native";

import { spacing } from "@/src/theme/tokens";

// La mascota de Pollink centrada arriba, como en las pantallas del Figma. Es el
// SVG oficial (51×40); `expo-image` lo dibuja sin dependencias nuevas. Sin
// margen superior propio: la pantalla pone el área segura.
export function BrandHeader({ testID = "brandHeader" }: { testID?: string }) {
  return (
    <View style={styles.container} testID={testID}>
      <Image
        source={require("../../../assets/images/pollink-logo.svg")}
        style={styles.logo}
        contentFit="contain"
        accessibilityLabel="Pollink"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  logo: {
    width: 51,
    height: 40,
  },
});

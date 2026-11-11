import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { Button, Text } from "react-native-paper";

import { EmptyState } from "@/src/core/components/EmptyState";
import { useFollowersCount } from "@/src/features/follows/presentation/hooks/useFollowersCount";
import { useFollowToggle } from "@/src/features/follows/presentation/hooks/useFollowToggle";
import { useSession } from "@/src/features/auth/presentation/context/SessionContext";
import { RootStackParamList } from "@/src/navigation/types";
import { TrustPill } from "@/src/features/trust/presentation/components/TrustPill";
import { spacing } from "@/src/theme/tokens";
import { ProfileProjects } from "../components/ProfileProjects";
import { ProfileView } from "../components/ProfileView";
import { usePersonProfileViewModel } from "../viewmodels/usePersonProfileViewModel";

// El perfil de otra persona (B7), de solo lectura: quién es y en qué anda, con
// un acceso a su historial de colaboración. Sus indicadores de confianza solo
// se muestran cuando se llega desde un proyecto (`projectId`: son miembros del
// mismo). Quien decide sobre una solicitud los ve en la ficha del aplicante.
export default function PersonProfileScreen() {
  const navigation = useNavigation();
  const { params } = useRoute<RouteProp<RootStackParamList, "PersonProfile">>();
  const vm = usePersonProfileViewModel(params.userId);
  const { currentUser } = useSession();
  const follow = useFollowToggle([params.userId]);
  const isFollowing = follow.isFollowing(params.userId);
  const followers = useFollowersCount(params.userId, isFollowing);
  const isMe = currentUser()?.userId === params.userId;

  if (vm.loading && !vm.profile) return <ActivityIndicator style={styles.loading} testID={PersonProfileScreen.loadingKey} />;

  if (!vm.profile) {
    return (
      <EmptyState
        icon="alert-circle-outline"
        title="No pudimos cargar este perfil"
        message={vm.error ?? undefined}
        action={
          <Button mode="contained" onPress={vm.reload} testID={PersonProfileScreen.retryKey}>
            Reintentar
          </Button>
        }
      />
    );
  }

  const userId = params.userId;
  return (
    <ScrollView contentContainerStyle={styles.content} testID={PersonProfileScreen.scrollKey}>
      <ProfileView
        profile={vm.profile}
        name="Usuario"
        actions={
          params.projectId || !isMe ? (
            <>
              {params.projectId ? (
                <TrustPill userId={userId} onPress={() => navigation.navigate("TrustIndicators", { userId })} testID={PersonProfileScreen.trustKey} />
              ) : null}
              {isMe ? null : (
                <Button
                  mode={isFollowing ? "outlined" : "contained-tonal"}
                  compact
                  onPress={() => follow.toggle(userId)}
                  testID={PersonProfileScreen.followKey}
                >
                  {isFollowing ? "Siguiendo" : "Seguir"}
                </Button>
              )}
            </>
          ) : undefined
        }
      >
        {followers !== null ? (
          <Text variant="bodyMedium" style={styles.followers} testID={PersonProfileScreen.followersKey}>
            {followers === 1 ? "1 seguidor" : `${followers} seguidores`}
          </Text>
        ) : null}
        {follow.error ? <Text variant="bodySmall" style={styles.followers}>{follow.error}</Text> : null}
        <ProfileProjects
          userId={userId}
          title="En qué anda"
          emptyText="Todavía no participa en ningún proyecto."
          onOpenProject={(projectId) => navigation.navigate("ProjectInfo", { projectId })}
        />
        <Button mode="outlined" icon="history" onPress={() => navigation.navigate("CollaborationHistory", { userId })} testID={PersonProfileScreen.historyKey}>
          Ver historial de colaboración
        </Button>
      </ProfileView>
    </ScrollView>
  );
}

PersonProfileScreen.loadingKey = "personProfile.loading";
PersonProfileScreen.retryKey = "personProfile.retry";
PersonProfileScreen.scrollKey = "personProfile.scroll";
PersonProfileScreen.trustKey = "personProfile.trust";
PersonProfileScreen.historyKey = "personProfile.history";
PersonProfileScreen.followKey = "personProfile.follow";
PersonProfileScreen.followersKey = "personProfile.followers";

const styles = StyleSheet.create({
  loading: { flex: 1 },
  followers: { textAlign: "center" },
  content: { paddingVertical: spacing.lg, paddingBottom: spacing.xl },
});

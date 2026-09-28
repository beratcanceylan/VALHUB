import { useMemo, useState } from "react";
import { View } from "react-native";
import { Stack, router } from "expo-router";
import type { AgentRole } from "@valhub/domain";
import { ChipRow, FilterChip, Grid, MediaCard, QueryView, Screen, useColumnWidth } from "@/components/ui";
import { useAgents } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";

const ROLES: AgentRole[] = ["DUELIST", "INITIATOR", "CONTROLLER", "SENTINEL"];

export default function AgentsScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const agents = useAgents();
  const [role, setRole] = useState<AgentRole | undefined>(undefined);
  const list = useMemo(() => (agents.data ?? []).filter((a) => !role || a.role === role), [agents.data, role]);
  const width = useColumnWidth(3, t.space[2]);

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("learn.agents") }} />
      <ChipRow>
        <FilterChip label={tr("agent.filterAll")} selected={!role} onPress={() => setRole(undefined)} />
        {ROLES.map((r) => (
          <FilterChip key={r} label={tr(`agent.role.${r}`)} selected={role === r} onPress={() => setRole(role === r ? undefined : r)} />
        ))}
      </ChipRow>
      <View style={{ height: t.space[3] }} />
      <QueryView query={agents}>
        {() => (
          <Grid gap={t.space[2]}>
            {list.map((a) => (
              <MediaCard
                key={a.id}
                width={width}
                aspectRatio={0.82}
                imageUri={a.iconUrl ?? a.portraitUrl}
                {...(a.gradient ? { gradient: a.gradient } : {})}
                title={a.name}
                subtitle={tr(`agent.role.${a.role}`)}
                onPress={() => router.push(`/agents/${a.slug}`)}
              />
            ))}
          </Grid>
        )}
      </QueryView>
    </Screen>
  );
}

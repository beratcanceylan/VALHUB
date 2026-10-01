import { useState } from "react";
import { Pressable, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import type { Ability, Agent } from "@valhub/domain";
import { HeroCard, IconButton, QueryView, RemoteImage, RemoteVideo, Screen, SectionHeader, Surface, Text, useColumnWidth, useToast } from "@/components/ui";
import { useAgent, useAgentMedia } from "@/data/queries";
import { useTheme } from "@/design/theme";
import { useT } from "@/i18n";
import { SLOT_ORDER } from "@/lib/format";
import { useFavorite } from "@/lib/useFavorite";

function AbilityPicker({ abilities, selected, onSelect }: Readonly<{ abilities: Ability[]; selected: number; onSelect: (i: number) => void }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const width = useColumnWidth(abilities.length, t.space[2]);
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: t.space[2] }}>
      {abilities.map((a, i) => {
        const active = i === selected;
        const slotLabel = tr(`agent.slot.${a.slot}`);
        return (
          <Pressable
            key={a.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${slotLabel}: ${a.name}`}
            onPress={() => onSelect(i)}
            style={{
              width,
              alignItems: "center",
              gap: t.space[1],
              paddingVertical: t.space[2],
              borderRadius: t.radius.md,
              borderCurve: "continuous",
              borderWidth: active ? t.borderWidth.thick : t.borderWidth.hairline,
              borderColor: active ? t.colors.accent : t.colors.border,
              backgroundColor: t.colors.surface,
            }}
          >
            {/* Ability icons are white glyphs; a dark chip keeps them visible in light mode too. */}
            <View style={{ width: 36, height: 36, borderRadius: t.radius.sm, borderCurve: "continuous", backgroundColor: t.colors.mediaScrim, alignItems: "center", justifyContent: "center" }}>
              <RemoteImage uri={a.iconUrl} width={26} height={26} contentFit="contain" radius={0} style={{ backgroundColor: "transparent" }} />
            </View>
            <Text variant="caption" weight="semibold" color={active ? "accent" : "textSecondary"} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
              {tr(`agent.slot.${a.slot}`)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Abilities({ agent }: Readonly<{ agent: Agent }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const media = useAgentMedia(agent.slug);
  const [selected, setSelected] = useState(0);
  const abilities = [...agent.abilities].sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
  const ability = abilities[selected] ?? abilities[0];
  if (!ability) return null;
  const video = media.data?.abilities.find((v) => v.slot === ability.slot);
  const posterProps = video?.thumbnailUrl ? { posterUri: video.thumbnailUrl } : {};
  return (
    <>
      <SectionHeader title={tr("agent.abilities")} />
      <AbilityPicker abilities={abilities} selected={selected} onSelect={setSelected} />
      <Surface padded style={{ marginTop: t.space[3], gap: t.space[3] }}>
        {video ? (
          <RemoteVideo key={video.videoUrl} uri={video.videoUrl} {...posterProps} label={`${ability.name}, ${tr("agent.demo")}`} />
        ) : null}
        <View style={{ gap: t.space[1] }}>
          <Text variant="caption" weight="medium" color="textSecondary">
            {tr(`agent.slot.${ability.slot}`)}
          </Text>
          <Text variant="titleSm" weight="semibold">
            {ability.name}
          </Text>
          <Text variant="bodySm" color="textSecondary" style={{ marginTop: t.space[1] }}>
            {ability.description}
          </Text>
        </View>
      </Surface>
    </>
  );
}

function FavoriteButton({ agent }: Readonly<{ agent: Agent }>) {
  const { t } = useT();
  const toast = useToast();
  const fav = useFavorite("AGENT", agent.slug, agent.name);
  return (
    <IconButton
      icon={fav.saved ? "saved" : "library"}
      label={fav.saved ? t("common.remove") : t("common.save")}
      selected={fav.saved}
      onPress={() => toast(fav.toggle() ? t("common.saved") : t("common.remove"))}
    />
  );
}

/** Module-level factory so the header button is not a component defined during render. */
function favoriteHeaderRight(agent: Agent) {
  return () => <FavoriteButton agent={agent} />;
}

export default function AgentDetailScreen() {
  const t = useTheme();
  const { t: tr } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const agent = useAgent(id);
  return (
    <Screen>
      <QueryView query={agent}>
        {(a) => (
          <>
            <Stack.Screen options={{ title: a.name, headerRight: favoriteHeaderRight(a) }} />
            <HeroCard
              imageUri={a.portraitUrl ?? a.iconUrl}
              contentPosition="top center"
              eyebrow={tr(`agent.role.${a.role}`)}
              title={a.name}
              height={380}
            />
            <Text variant="bodySm" color="textSecondary" style={{ marginTop: t.space[3] }}>
              {a.description}
            </Text>
            <Abilities agent={a} />
          </>
        )}
      </QueryView>
    </Screen>
  );
}

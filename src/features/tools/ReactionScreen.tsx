import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Pressable, View } from "react-native";
import { Stack } from "expo-router";
import * as Haptics from "expo-haptics";
import { REACTION_ANTICIPATION_MS, randomReactionDelay, summarizeReactions, type TrainingSession } from "@valhub/domain";
import { Button, ListRow, Metric, RowGroup, Screen, SectionHeader, Text } from "@/components/ui";
import { training } from "@/data/repositories/library";
import { useTheme, type Theme } from "@/design/theme";
import { useT } from "@/i18n";

const ATTEMPTS = 5;
type Phase = "idle" | "waiting" | "go" | "early" | "result" | "done";

function useReactionGame(announce: () => void) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [samples, setSamples] = useState<number[]>([]);
  const [last, setLast] = useState<number | undefined>(undefined);
  const [history, setHistory] = useState<TrainingSession[]>(() => training.list(10));
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const arm = () => {
    setPhase("waiting");
    timer.current = setTimeout(() => {
      goAt.current = performance.now();
      setPhase("go");
      announce();
    }, randomReactionDelay());
  };

  const start = () => {
    setSamples([]);
    setLast(undefined);
    arm();
  };

  const record = () => {
    const ms = Math.round(performance.now() - goAt.current);
    void Haptics.selectionAsync();
    setLast(ms);
    const next = ms >= REACTION_ANTICIPATION_MS ? [...samples, ms] : samples;
    setSamples(next);
    if (next.length < ATTEMPTS) {
      setPhase("result");
      return;
    }
    const summary = summarizeReactions(next);
    if (summary) {
      training.add({ kind: "REACTION", startedAt: new Date().toISOString(), attempts: next, bestMs: summary.bestMs, averageMs: summary.averageMs });
      setHistory(training.list(10));
    }
    setPhase("done");
  };

  const tap = () => {
    if (phase === "waiting") {
      clearTimeout(timer.current);
      setPhase("early");
    } else if (phase === "early" || phase === "result") {
      arm();
    } else if (phase === "go") {
      record();
    }
  };

  return { phase, samples, last, history, start, tap };
}

const PANEL_COLOR: Partial<Record<Phase, keyof Theme["colors"]>> = { go: "positive", waiting: "accent", early: "warningSubtle" };

function ReactionPanel({ phase, last, attempt, onTap }: Readonly<{ phase: Phase; last: number | undefined; attempt: number; onTap: () => void }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const text: Partial<Record<Phase, string>> = { go: tr("reaction.now"), waiting: tr("reaction.wait"), early: tr("reaction.tooSoon") };
  if (phase === "result" && last !== undefined) {
    text.result = `${tr("reaction.result", { ms: last })} · ${tr("reaction.attempt", { n: attempt, total: ATTEMPTS })}`;
  }
  const panelText = text[phase] ?? tr("reaction.wait");
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={tr("reaction.panel")}
      accessibilityHint={panelText}
      onPressIn={onTap}
      style={{ height: 320, borderRadius: t.radius.md, backgroundColor: t.colors[PANEL_COLOR[phase] ?? "surfaceSunken"], alignItems: "center", justifyContent: "center", padding: t.space[6] }}
    >
      <Text variant="title" weight="bold" align="center" color={phase === "go" || phase === "waiting" ? "onAccent" : "textPrimary"}>
        {panelText}
      </Text>
    </Pressable>
  );
}

function SessionSummary({ samples }: Readonly<{ samples: number[] }>) {
  const t = useTheme();
  const { t: tr } = useT();
  const summary = summarizeReactions(samples);
  if (!summary) return null;
  return (
    <View style={{ flexDirection: "row", gap: t.space[3], marginTop: t.space[4] }}>
      <Metric label={tr("reaction.best")} value={tr("reaction.result", { ms: summary.bestMs })} />
      <Metric label={tr("reaction.average")} value={tr("reaction.result", { ms: summary.averageMs })} />
      <Metric label={tr("reaction.median")} value={tr("reaction.result", { ms: summary.medianMs })} />
    </View>
  );
}

function ReactionHistory({ history }: Readonly<{ history: TrainingSession[] }>) {
  const { t: tr, formatDateTime } = useT();
  return (
    <>
      <SectionHeader title={tr("reaction.history")} />
      {history.length === 0 ? (
        <Text variant="bodySm" color="textSecondary">
          {tr("reaction.historyEmpty")}
        </Text>
      ) : (
        <RowGroup>
          {history.map((s) => (
            <ListRow
              key={s.id}
              title={`${tr("reaction.best")} ${tr("reaction.result", { ms: s.bestMs })} · ${tr("reaction.average")} ${tr("reaction.result", { ms: s.averageMs })}`}
              subtitle={formatDateTime(s.startedAt)}
            />
          ))}
        </RowGroup>
      )}
    </>
  );
}

export default function ReactionScreen() {
  const { t: tr } = useT();
  const game = useReactionGame(() => AccessibilityInfo.announceForAccessibility(tr("reaction.now")));
  const idle = game.phase === "idle" || game.phase === "done";

  return (
    <Screen>
      <Stack.Screen options={{ title: tr("reaction.title") }} />
      {idle ? (
        <Button label={game.phase === "done" ? tr("reaction.again") : tr("reaction.start")} onPress={game.start} />
      ) : (
        <ReactionPanel phase={game.phase} last={game.last} attempt={game.samples.length + 1} onTap={game.tap} />
      )}
      <SessionSummary samples={game.samples} />
      <ReactionHistory history={game.history} />
    </Screen>
  );
}

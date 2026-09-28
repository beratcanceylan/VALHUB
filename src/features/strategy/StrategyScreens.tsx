import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Share, View, useWindowDimensions, type GestureResponderEvent } from "react-native";
import { Stack, router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Circle, G, Line, Polygon, Polyline, Text as SvgText } from "react-native-svg";
import { type AbilitySlot, type AgentSummary, type NormalizedMapPoint, type Strategy, type StrategyColor, type StrategyElement, type StrategyFrame } from "@valhub/domain";
import { analytics } from "@/analytics";
import { HaloText, Minimap } from "@/components/domain/Minimap";
import { MapRow } from "@/components/domain/rows";
import {
  Button,
  ChipRow,
  EmptyState,
  FilterChip,
  IconButton,
  ListRow,
  Modal,
  QueryView,
  Row,
  RowGroup,
  Screen,
  SectionHeader,
  SegmentedControl,
  Surface,
  Text,
  TextInput,
  useToast,
  type IconName,
} from "@/components/ui";
import { useAgent, useAgents, useMap, useMaps } from "@/data/queries";
import { strategies } from "@/data/repositories/library";
import { useTheme, type Theme } from "@/design/theme";
import { useT } from "@/i18n";
import { newId } from "@/lib/id";

// ---------- list / new ----------

export function StrategyListScreen() {
  const { t, formatDateTime } = useT();
  const maps = useMaps();
  const [items, setItems] = useState<Strategy[]>([]);
  useFocusEffect(useCallback(() => setItems(strategies.list()), []));
  return (
    <Screen>
      <Stack.Screen options={{ title: t("strategy.title") }} />
      <Button label={t("strategy.new")} icon="plus" onPress={() => router.push("/strategy/new")} />
      <View style={{ height: 16 }} />
      {items.length === 0 ? (
        <Surface>
          <EmptyState icon="pencil" title={t("strategy.empty")} message={t("strategy.emptyBody")} />
        </Surface>
      ) : (
        <RowGroup>
          {items.map((s) => (
            <ListRow
              key={s.id}
              title={s.title}
              subtitle={`${maps.data?.find((m) => m.id === s.mapId)?.name ?? ""} · ${formatDateTime(s.updatedAt, { dateStyle: "medium" })}`}
              onPress={() => router.push(`/strategy/${s.id}`)}
            />
          ))}
        </RowGroup>
      )}
    </Screen>
  );
}

function createStrategy(mapId: string, title: string): Strategy {
  const strategy: Strategy = {
    id: newId(),
    mapId,
    title,
    version: 0,
    frames: [{ id: newId(), elements: [] }],
    updatedAt: new Date().toISOString(),
  };
  strategies.save(strategy);
  analytics.track("strategy_created");
  return strategy;
}

export function StrategyNewScreen() {
  const { t } = useT();
  const params = useLocalSearchParams<{ mapId?: string }>();
  const maps = useMaps();
  const created = useRef(false);

  useEffect(() => {
    if (params.mapId && !created.current) {
      created.current = true;
      const s = createStrategy(params.mapId, t("strategy.untitled"));
      router.replace(`/strategy/${s.id}`);
    }
  }, [params.mapId, t]);

  return (
    <Screen>
      <Stack.Screen options={{ title: t("strategy.pickMap") }} />
      <QueryView query={maps}>
        {(list) => (
          <RowGroup>
            {list
              .filter((m) => m.isStandard)
              .map((m) => (
                <MapRow
                  key={m.id}
                  map={m}
                  onPress={() => {
                    const s = createStrategy(m.id, t("strategy.untitled"));
                    router.replace(`/strategy/${s.id}`);
                  }}
                />
              ))}
          </RowGroup>
        )}
      </QueryView>
    </Screen>
  );
}

// ---------- editor ----------

type Tool = "select" | "agent" | "ability" | "arrow" | "path" | "area" | "label" | "eraser";
type Team = "ALLY" | "ENEMY";

const TOOLS: Array<{ tool: Tool; icon: IconName }> = [
  { tool: "select", icon: "select" },
  { tool: "agent", icon: "user" },
  { tool: "ability", icon: "zap" },
  { tool: "arrow", icon: "arrow" },
  { tool: "path", icon: "pencil" },
  { tool: "area", icon: "area" },
  { tool: "label", icon: "text" },
  { tool: "eraser", icon: "eraser" },
];

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function colorFor(theme: Theme, c: StrategyColor): string {
  switch (c) {
    case "ALLY":
      return theme.colors.ally;
    case "ENEMY":
      return theme.colors.enemy;
    case "ACCENT":
      return theme.colors.accent;
    default:
      return theme.colors.textPrimary;
  }
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function elementAnchor(el: StrategyElement): { x: number; y: number } {
  switch (el.kind) {
    case "AGENT":
    case "ABILITY":
    case "LABEL":
      return { x: el.x, y: el.y };
    case "ARROW":
      return { x: (el.from.x + el.to.x) / 2, y: (el.from.y + el.to.y) / 2 };
    case "PATH":
    case "AREA": {
      const n = el.points.length || 1;
      return { x: el.points.reduce((s, p) => s + p.x, 0) / n, y: el.points.reduce((s, p) => s + p.y, 0) / n };
    }
  }
}

/** Distance from `p` to the closest grabbable point of an element. */
function distanceTo(el: StrategyElement, p: NormalizedMapPoint): number {
  if (el.kind === "PATH" || el.kind === "AREA") return Math.min(...el.points.map((q) => distance(q, p)));
  if (el.kind === "ARROW") return Math.min(distance(el.from, p), distance(el.to, p), distance(elementAnchor(el), p));
  return distance(elementAnchor(el), p);
}

function nearestElement(elements: StrategyElement[], p: NormalizedMapPoint, threshold = 0.05, movableOnly = false) {
  let best: StrategyElement | undefined;
  let bestD = threshold;
  for (const el of elements) {
    if (movableOnly && !(el.kind === "AGENT" || el.kind === "ABILITY" || el.kind === "LABEL")) continue;
    const d = distanceTo(el, p);
    if (d < bestD) {
      bestD = d;
      best = el;
    }
  }
  return best;
}

function ElementView({ el, size, theme, agentLabel, selected }: Readonly<{ el: StrategyElement; size: number; theme: Theme; agentLabel: (id: string) => string; selected: boolean }>) {
  const s = (v: number) => v * size;
  const stroke = selected ? theme.colors.focusRing : theme.colors.background;
  switch (el.kind) {
    case "AGENT": {
      const fill = el.team === "ALLY" ? theme.colors.ally : theme.colors.enemy;
      return (
        <G>
          <Circle cx={s(el.x)} cy={s(el.y)} r={12} fill={fill} stroke={stroke} strokeWidth={2} />
          <SvgText x={s(el.x)} y={s(el.y) + 4} fontSize={10} fontWeight="700" fill={theme.colors.onAccent} textAnchor="middle">
            {agentLabel(el.agentId).slice(0, 2).toUpperCase()}
          </SvgText>
        </G>
      );
    }
    case "ABILITY": {
      const x = s(el.x);
      const y = s(el.y);
      return (
        <G>
          <Polygon points={`${x},${y - 11} ${x + 11},${y} ${x},${y + 11} ${x - 11},${y}`} fill={theme.colors.warning} stroke={stroke} strokeWidth={2} />
          <SvgText x={x} y={y + 4} fontSize={10} fontWeight="700" fill={theme.colors.textInverse} textAnchor="middle">
            {el.abilityId}
          </SvgText>
        </G>
      );
    }
    case "ARROW": {
      const color = colorFor(theme, el.color);
      const [x1, y1, x2, y2] = [s(el.from.x), s(el.from.y), s(el.to.x), s(el.to.y)];
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const head = 10;
      const p1 = `${x2 - head * Math.cos(angle - 0.4)},${y2 - head * Math.sin(angle - 0.4)}`;
      const p2 = `${x2 - head * Math.cos(angle + 0.4)},${y2 - head * Math.sin(angle + 0.4)}`;
      return (
        <G>
          <Line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={selected ? 4 : 3} />
          <Polygon points={`${x2},${y2} ${p1} ${p2}`} fill={color} />
        </G>
      );
    }
    case "PATH":
      return <Polyline points={el.points.map((p) => `${s(p.x)},${s(p.y)}`).join(" ")} fill="none" stroke={colorFor(theme, el.color)} strokeWidth={selected ? 4 : 3} strokeDasharray="6 4" strokeLinecap="round" />;
    case "AREA":
      return <Polygon points={el.points.map((p) => `${s(p.x)},${s(p.y)}`).join(" ")} fill={colorFor(theme, el.color)} fillOpacity={0.22} stroke={colorFor(theme, el.color)} strokeWidth={selected ? 3 : 2} />;
    case "LABEL":
      return (
        <HaloText x={s(el.x)} y={s(el.y)} text={el.text} fill={theme.colors.textPrimary} halo={selected ? theme.colors.focusRing : theme.colors.background} fontSize={12} />
      );
  }
}

const SLOTS: AbilitySlot[] = ["C", "Q", "E", "X"];
const HISTORY_LIMIT = 50;

export function StrategyEditorScreen() {
  const { t } = useT();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [initial] = useState<Strategy | undefined>(() => strategies.get(id));
  if (!initial) {
    return (
      <Screen>
        <EmptyState title={t("errors.NOT_FOUND.title")} />
      </Screen>
    );
  }
  return <StrategyEditor key={initial.id} initial={initial} />;
}

/** Strategy state with undo/redo history and a debounced on-device autosave. */
function useStrategyDocument(initial: Strategy) {
  const [strategy, setStrategy] = useState(initial);
  const [frameIndex, setFrameIndex] = useState(0);
  const [past, setPast] = useState<StrategyFrame[][]>([]);
  const [future, setFuture] = useState<StrategyFrame[][]>([]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const persist = useCallback(
    (next: Strategy) => {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        strategies.save(next);
      }, 700);
    },
    [],
  );
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const frame = strategy.frames[Math.min(frameIndex, strategy.frames.length - 1)] ?? { id: "", elements: [] };

  const replace = (patch: Partial<Strategy>) => {
    const next = { ...strategy, ...patch, updatedAt: new Date().toISOString() };
    setStrategy(next);
    persist(next);
  };
  const snapshot = () => setPast((p) => [...p.slice(-(HISTORY_LIMIT - 1)), strategy.frames]);
  const commitFrames = (frames: StrategyFrame[]) => {
    snapshot();
    setFuture([]);
    replace({ frames });
  };
  const updateElements = (fn: (els: StrategyElement[]) => StrategyElement[]) =>
    commitFrames(strategy.frames.map((f, i) => (i === frameIndex ? { ...f, elements: fn(f.elements) } : f)));

  return {
    strategy,
    frame,
    frameIndex,
    setFrameIndex,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    snapshot,
    updateElements,
    addElement: (el: StrategyElement) => updateElements((els) => [...els, el]),
    undo: () => {
      const prev = past[past.length - 1];
      if (!prev) return;
      setFuture((f) => [strategy.frames, ...f]);
      setPast((p) => p.slice(0, -1));
      replace({ frames: prev });
      setFrameIndex((i) => Math.min(i, prev.length - 1));
    },
    redo: () => {
      const nextFrames = future[0];
      if (!nextFrames) return;
      setPast((p) => [...p, strategy.frames]);
      setFuture((f) => f.slice(1));
      replace({ frames: nextFrames });
    },
    /** Live drag preview: no history entry and no save until `finishMove`. */
    moveElement: (elementId: string, p: NormalizedMapPoint) =>
      setStrategy((s) => ({
        ...s,
        frames: s.frames.map((f, i) =>
          i === frameIndex
            ? { ...f, elements: f.elements.map((el) => (el.id === elementId && (el.kind === "AGENT" || el.kind === "ABILITY" || el.kind === "LABEL") ? { ...el, x: p.x, y: p.y } : el)) }
            : f,
        ),
      })),
    finishMove: () => persist({ ...strategy, updatedAt: new Date().toISOString() }),
    addFrame: () => {
      const copy: StrategyFrame = { id: newId(), elements: frame.elements.map((el) => ({ ...el, id: newId() })) };
      commitFrames([...strategy.frames.slice(0, frameIndex + 1), copy, ...strategy.frames.slice(frameIndex + 1)]);
      setFrameIndex(frameIndex + 1);
    },
    deleteFrame: () => {
      if (strategy.frames.length <= 1) return;
      commitFrames(strategy.frames.filter((_, i) => i !== frameIndex));
      setFrameIndex(Math.max(0, frameIndex - 1));
    },
    rename: (title: string) => replace({ title }),
    remove: () => {
      strategies.remove(strategy.id);
    },
  };
}

type StrategyDocument = ReturnType<typeof useStrategyDocument>;
interface ToolSettings {
  tool: Tool;
  team: Team;
  agentId: string | undefined;
  slot: AbilitySlot;
}

/** Turns touches on the minimap into strategy edits for the active tool. */
function useCanvasGestures(doc: StrategyDocument, { tool, team, agentId, slot }: ToolSettings) {
  const size = useRef(0);
  const dragging = useRef<string | undefined>(undefined);
  const drawing = useRef<NormalizedMapPoint[] | undefined>(undefined);
  const [draft, setDraft] = useState<NormalizedMapPoint[] | undefined>(undefined);
  const [pending, setPending] = useState<NormalizedMapPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [labelAt, setLabelAt] = useState<NormalizedMapPoint | undefined>(undefined);
  const color: StrategyColor = team === "ALLY" ? "ALLY" : "ENEMY";

  const toPoint = (e: GestureResponderEvent): NormalizedMapPoint | undefined => {
    if (!size.current) return undefined;
    return { x: clamp01(e.nativeEvent.locationX / size.current), y: clamp01(e.nativeEvent.locationY / size.current) };
  };

  const onGrant = (e: GestureResponderEvent) => {
    const p = toPoint(e);
    if (!p) return;
    if (tool === "path") {
      drawing.current = [p];
      setDraft([p]);
    } else if (tool === "select") {
      const hit = nearestElement(doc.frame.elements, p, 0.06, true);
      setSelectedId(hit?.id);
      dragging.current = hit?.id;
      if (hit) doc.snapshot();
    }
  };

  const onMove = (e: GestureResponderEvent) => {
    const p = toPoint(e);
    if (!p) return;
    const stroke = drawing.current;
    const last = stroke?.[stroke.length - 1];
    if (tool === "path" && stroke && last) {
      if (distance(last, p) > 0.012 && stroke.length < 200) {
        drawing.current = [...stroke, p];
        setDraft(drawing.current);
      }
    } else if (tool === "select" && dragging.current) {
      doc.moveElement(dragging.current, p);
    }
  };

  const placeAt = (p: NormalizedMapPoint) => {
    switch (tool) {
      case "agent":
        if (agentId) doc.addElement({ kind: "AGENT", id: newId(), agentId, x: p.x, y: p.y, team });
        break;
      case "ability":
        if (agentId) doc.addElement({ kind: "ABILITY", id: newId(), agentId, abilityId: slot, x: p.x, y: p.y });
        break;
      case "arrow": {
        const from = pending[0];
        if (from) {
          doc.addElement({ kind: "ARROW", id: newId(), from, to: p, color });
          setPending([]);
        } else setPending([p]);
        break;
      }
      case "area":
        // Duplicate vertices add nothing to the polygon (and would collide as marker keys).
        setPending((prev) => (prev.length < 40 && !prev.some((q) => q.x === p.x && q.y === p.y) ? [...prev, p] : prev));
        break;
      case "label":
        setLabelAt(p);
        break;
      case "eraser": {
        const hit = nearestElement(doc.frame.elements, p);
        if (hit) doc.updateElements((els) => els.filter((el) => el.id !== hit.id));
        break;
      }
    }
  };

  const onRelease = (e: GestureResponderEvent) => {
    if (tool === "path") {
      const pts = drawing.current;
      drawing.current = undefined;
      setDraft(undefined);
      if (pts && pts.length >= 2) doc.addElement({ kind: "PATH", id: newId(), points: pts, color });
      return;
    }
    if (tool === "select") {
      if (dragging.current) {
        dragging.current = undefined;
        doc.finishMove();
      }
      return;
    }
    const p = toPoint(e);
    if (p) placeAt(p);
  };

  return {
    size,
    color,
    draft,
    pending,
    selectedId,
    labelAt,
    onGrant,
    onMove,
    onRelease,
    resetTool: () => {
      setPending([]);
      setSelectedId(undefined);
    },
    finishArea: () => {
      doc.addElement({ kind: "AREA", id: newId(), points: pending, color });
      setPending([]);
    },
    closeLabel: () => setLabelAt(undefined),
    addLabel: (text: string) => {
      if (labelAt) doc.addElement({ kind: "LABEL", id: newId(), x: labelAt.x, y: labelAt.y, text });
      setLabelAt(undefined);
    },
  };
}

type CanvasGestures = ReturnType<typeof useCanvasGestures>;

function StrategyEditor({ initial }: Readonly<{ initial: Strategy }>) {
  const theme = useTheme();
  const { t } = useT();
  const doc = useStrategyDocument(initial);
  const agents = useAgents();
  const [tool, setTool] = useState<Tool>("agent");
  const [team, setTeam] = useState<Team>("ALLY");
  const [agentId, setAgentId] = useState<string | undefined>(undefined);
  const [slot, setSlot] = useState<AbilitySlot>("C");
  const [renaming, setRenaming] = useState(false);
  const canvas = useCanvasGestures(doc, { tool, team, agentId, slot });

  useEffect(() => {
    if (!agentId && agents.data?.[0]) setAgentId(agents.data[0].id);
  }, [agents.data, agentId]);

  return (
    <Screen scrollEnabled={!(tool === "path" || tool === "select")}>
      <EditorHeader doc={doc} />
      <FrameChips doc={doc} />
      <StrategyCanvas doc={doc} canvas={canvas} agents={agents.data} />
      <ToolPalette
        tool={tool}
        onSelect={(tl) => {
          setTool(tl);
          canvas.resetTool();
        }}
      />
      {tool === "area" && canvas.pending.length >= 3 ? (
        <Button label={t("strategy.finishArea")} size="sm" style={{ alignSelf: "flex-start", marginTop: theme.space[2] }} onPress={canvas.finishArea} />
      ) : null}
      <View style={{ marginTop: theme.space[3] }}>
        <SegmentedControl label={t("strategy.team.ALLY")} value={team} onChange={setTeam} options={(["ALLY", "ENEMY"] as const).map((v) => ({ value: v, label: t(`strategy.team.${v}`) }))} />
      </View>
      {tool === "agent" || tool === "ability" ? (
        <AgentAbilityPicker agents={agents.data} agentId={agentId} onAgent={setAgentId} slot={tool === "ability" ? slot : undefined} onSlot={setSlot} />
      ) : null}
      <StrategyActions doc={doc} onRename={() => setRenaming(true)} />
      <LabelModal at={canvas.labelAt} onClose={canvas.closeLabel} onAdd={canvas.addLabel} />
      <RenameModal
        visible={renaming}
        initial={doc.strategy.title}
        onClose={() => setRenaming(false)}
        onSave={(title) => {
          doc.rename(title);
          setRenaming(false);
        }}
      />
    </Screen>
  );
}

function EditorActions({ doc }: Readonly<{ doc: StrategyDocument }>) {
  const { t } = useT();
  const toast = useToast();
  const exportJson = () => {
    Share.share({ message: JSON.stringify({ ...doc.strategy, $schema: "valhub.strategy.v1" }) }).catch(() => undefined);
    toast(t("strategy.exported"));
  };
  return (
    <Row gap={1}>
      <IconButton icon="undo" label={t("strategy.undo")} onPress={doc.undo} disabled={!doc.canUndo} />
      <IconButton icon="redo" label={t("strategy.redo")} onPress={doc.redo} disabled={!doc.canRedo} />
      <IconButton icon="share" label={t("common.share")} onPress={exportJson} />
    </Row>
  );
}

/** Module-level factory so the header actions are not a component defined during render. */
function editorHeaderRight(doc: StrategyDocument) {
  return () => <EditorActions doc={doc} />;
}

function EditorHeader({ doc }: Readonly<{ doc: StrategyDocument }>) {
  return <Stack.Screen options={{ title: doc.strategy.title, headerRight: editorHeaderRight(doc) }} />;
}

function FrameChips({ doc }: Readonly<{ doc: StrategyDocument }>) {
  const { t } = useT();
  return (
    <ChipRow>
      {doc.strategy.frames.map((f, i) => (
        <FilterChip key={f.id} label={t("strategy.frame", { n: i + 1 })} selected={i === doc.frameIndex} onPress={() => doc.setFrameIndex(i)} />
      ))}
      <FilterChip label={`+ ${t("strategy.addFrame")}`} selected={false} onPress={doc.addFrame} />
    </ChipRow>
  );
}

function StrategyCanvas({ doc, canvas, agents }: Readonly<{ doc: StrategyDocument; canvas: CanvasGestures; agents: AgentSummary[] | undefined }>) {
  const theme = useTheme();
  const { t } = useT();
  const map = useMap(doc.strategy.mapId);
  const agentLabel = useCallback((aid: string) => agents?.find((a) => a.id === aid)?.name ?? "?", [agents]);
  const { draft, pending } = canvas;
  return (
    <View
      style={{ marginTop: theme.space[2] }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={canvas.onGrant}
      onResponderMove={canvas.onMove}
      onResponderRelease={canvas.onRelease}
    >
      <Minimap
        uri={map.data?.minimapImageUrl}
        label={t("strategy.canvas", { count: doc.frame.elements.length })}
        onLayoutSize={(s) => {
          canvas.size.current = s;
        }}
      >
        {(px) => (
          <>
            {doc.frame.elements.map((el) => (
              <ElementView key={el.id} el={el} size={px} theme={theme} agentLabel={agentLabel} selected={el.id === canvas.selectedId} />
            ))}
            {draft && draft.length > 1 ? <Polyline points={draft.map((p) => `${p.x * px},${p.y * px}`).join(" ")} fill="none" stroke={colorFor(theme, canvas.color)} strokeWidth={3} /> : null}
            {pending.map((p) => (
              <Circle key={`${p.x}:${p.y}`} cx={p.x * px} cy={p.y * px} r={4} fill={theme.colors.focusRing} />
            ))}
          </>
        )}
      </Minimap>
    </View>
  );
}

function ToolPalette({ tool, onSelect }: Readonly<{ tool: Tool; onSelect: (tool: Tool) => void }>) {
  const theme = useTheme();
  const { t } = useT();
  const { width } = useWindowDimensions();
  // All eight tools on one row: shrink the hit box a little on 375 pt phones instead of wrapping.
  const box = Math.min(theme.touchTarget.min, Math.floor((width - theme.space[4] * 2) / TOOLS.length));
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: theme.space[2] }}>
      {TOOLS.map(({ tool: tl, icon }) => (
        <IconButton key={tl} box={box} icon={icon} label={tl === "ability" ? t("agent.abilities") : t(`strategy.tools.${tl}`)} selected={tool === tl} onPress={() => onSelect(tl)} />
      ))}
    </View>
  );
}

/** Agent chips, plus ability slot chips when `slot` is set (ability tool). */
function AgentAbilityPicker({
  agents,
  agentId,
  onAgent,
  slot,
  onSlot,
}: Readonly<{
  agents: AgentSummary[] | undefined;
  agentId: string | undefined;
  onAgent: (id: string) => void;
  slot: AbilitySlot | undefined;
  onSlot: (slot: AbilitySlot) => void;
}>) {
  const theme = useTheme();
  const { t } = useT();
  const agent = useAgent(agentId ?? "");
  return (
    <>
      <SectionHeader title={t("strategy.chooseAgent")} />
      <ChipRow>
        {(agents ?? []).map((a) => (
          <FilterChip key={a.id} label={a.name} selected={agentId === a.id} onPress={() => onAgent(a.id)} />
        ))}
      </ChipRow>
      {slot ? (
        <View style={{ marginTop: theme.space[2] }}>
          <ChipRow>
            {SLOTS.map((sl) => {
              const ability = agent.data?.abilities.find((a) => a.slot === sl);
              const label = ability ? `${sl} · ${ability.name}` : sl;
              return <FilterChip key={sl} label={label} selected={slot === sl} onPress={() => onSlot(sl)} />;
            })}
          </ChipRow>
        </View>
      ) : null}
    </>
  );
}

function StrategyActions({ doc, onRename }: Readonly<{ doc: StrategyDocument; onRename: () => void }>) {
  const theme = useTheme();
  const { t } = useT();
  const confirmDelete = () =>
    Alert.alert(t("strategy.deleteStrategy"), doc.strategy.title, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => {
          doc.remove();
          router.back();
        },
      },
    ]);
  return (
    <>
      <SectionHeader title={t("strategy.title")} />
      <Row gap={2} style={{ flexWrap: "wrap" }}>
        <Button label={t("strategy.rename")} variant="secondary" size="sm" icon="pencil" onPress={onRename} />
        <Button label={t("strategy.deleteFrame")} variant="secondary" size="sm" disabled={doc.strategy.frames.length <= 1} onPress={doc.deleteFrame} />
      </Row>
      <Button label={t("strategy.deleteStrategy")} variant="destructive" size="sm" icon="trash" style={{ alignSelf: "flex-start", marginTop: theme.space[2] }} onPress={confirmDelete} />
      <Text variant="caption" color="textTertiary" style={{ marginTop: theme.space[3] }}>
        {t("strategy.autosaved")}
      </Text>
    </>
  );
}

function LabelModal({ at, onClose, onAdd }: Readonly<{ at: NormalizedMapPoint | undefined; onClose: () => void; onAdd: (text: string) => void }>) {
  const { t } = useT();
  const [text, setText] = useState("");
  // Clear on the way out so the next label starts empty.
  const close = () => {
    setText("");
    onClose();
  };
  const add = () => {
    setText("");
    onAdd(text.trim());
  };
  return (
    <Modal visible={!!at} title={t("strategy.labelPrompt")} onClose={close}>
      <TextInput label={t("strategy.labelPrompt")} hideLabel value={text} onChangeText={setText} maxLength={40} autoFocus />
      <Button label={t("common.done")} disabled={text.trim().length === 0} onPress={add} />
    </Modal>
  );
}

function RenameModal({ visible, initial, onClose, onSave }: Readonly<{ visible: boolean; initial: string; onClose: () => void; onSave: (title: string) => void }>) {
  const { t } = useT();
  const [value, setValue] = useState(initial);
  useEffect(() => setValue(initial), [initial, visible]);
  const trimmed = useMemo(() => value.trim(), [value]);
  return (
    <Modal visible={visible} title={t("strategy.rename")} onClose={onClose}>
      <TextInput label={t("strategy.rename")} hideLabel value={value} onChangeText={setValue} maxLength={80} autoFocus />
      <Button label={t("common.save")} disabled={!trimmed} onPress={() => onSave(trimmed)} />
    </Modal>
  );
}

import { getPreference } from "@/data/cache/db";

/**
 * Analytics interface. Components call `analytics.track` with a closed set of events; the
 * sink is swappable (no vendor SDK calls scattered through screens). Payloads are limited
 * to non-identifying primitives — never tokens, raw API responses, PUUIDs or free text.
 */
type AnalyticsEvent =
  | { name: "screen_view"; props: { screen: string } }
  | { name: "search_performed"; props: { length: number; groups: number } }
  | { name: "search_result_opened"; props: { kind: string } }
  | { name: "crosshair_saved"; props?: undefined }
  | { name: "strategy_created"; props?: undefined }
  | { name: "notification_preference_changed"; props: { category: string; enabled: boolean } }
  | { name: "riot_link_started"; props?: undefined }
  | { name: "riot_link_completed"; props?: undefined }
  | { name: "provider_error"; props: { code: string; area: string } };

type EventName = AnalyticsEvent["name"];
type PropsOf<N extends EventName> = Extract<AnalyticsEvent, { name: N }>["props"];

export interface AnalyticsSink {
  send(name: EventName, props: Record<string, string | number | boolean> | undefined): void;
}

/** Development sink; production wires a real vendor behind this interface. */
const consoleSink: AnalyticsSink = {
  send(name, props) {
    if (__DEV__) console.debug("[analytics]", name, props ?? {});
  },
};

let sink: AnalyticsSink = consoleSink;

export const analytics = {
  setSink(next: AnalyticsSink) {
    sink = next;
  },
  track<N extends EventName>(name: N, ...props: PropsOf<N> extends undefined ? [] : [PropsOf<N>]): void {
    if (!getPreference("analyticsEnabled", true)) return;
    sink.send(name, props[0] as Record<string, string | number | boolean> | undefined);
  },
};

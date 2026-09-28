import { fireEvent, render, screen } from "@testing-library/react-native";
import { parseCrosshairCode } from "@valhub/domain";
import { CrosshairPreview } from "@/components/domain/CrosshairPreview";
import { Badge, Button, ErrorState, FilterChip, IconButton, SegmentedControl, Switch, TrendValue } from "@/components/ui";
import { Providers } from "./helpers";

describe("accessibility of UI primitives", () => {
  it("buttons expose role, name and disabled state", async () => {
    const onPress = jest.fn();
    await render(
      <Providers>
        <Button label="Save strategy" onPress={onPress} />
        <Button label="Disabled" disabled />
      </Providers>,
    );
    const save = screen.getByRole("button", { name: "Save strategy" });
    await fireEvent.press(save);
    expect(onPress).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Disabled" })).toBeDisabled();
  });

  it("icon-only buttons have an accessible name", async () => {
    await render(
      <Providers>
        <IconButton icon="search" label="Search" onPress={() => undefined} />
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeOnTheScreen();
  });

  it("switches report checked state", async () => {
    const onChange = jest.fn();
    await render(
      <Providers>
        <Switch label="Patch notes" value={false} onValueChange={onChange} />
      </Providers>,
    );
    const toggle = screen.getByRole("switch", { name: "Patch notes" });
    expect(toggle).not.toBeChecked();
    await fireEvent.press(toggle);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("filter chips and segmented controls expose selection", async () => {
    await render(
      <Providers>
        <FilterChip label="Attack" selected onPress={() => undefined} />
        <SegmentedControl
          label="View"
          value="a"
          onChange={() => undefined}
          options={[
            { value: "a", label: "Upcoming" },
            { value: "b", label: "Results" },
          ]}
        />
      </Providers>,
    );
    expect(screen.getByRole("checkbox", { name: "Attack" })).toBeChecked();
    expect(screen.getByRole("tab", { name: "Upcoming" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Results" })).not.toBeSelected();
  });

  it("status never relies on color alone", async () => {
    await render(
      <Providers>
        <Badge label="Live" tone="live" />
        <TrendValue label="Win rate" value={-0.05} format={(v) => `${(v * 100).toFixed(0)}%`} />
      </Providers>,
    );
    expect(screen.getByText("Live")).toBeOnTheScreen();
    expect(screen.getByLabelText("Win rate −5%")).toBeOnTheScreen();
  });

  it("error states are announced as alerts with a retry action", async () => {
    const retry = jest.fn();
    await render(
      <Providers>
        <ErrorState code="NETWORK" onRetry={retry} />
      </Providers>,
    );
    expect(screen.getByRole("alert")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalled();
  });

  it("non-retryable errors do not offer retry", async () => {
    await render(
      <Providers>
        <ErrorState code="FORBIDDEN" onRetry={() => undefined} />
      </Providers>,
    );
    expect(screen.queryByRole("button", { name: "Try again" })).toBeNull();
  });

  it("crosshair preview is labelled", async () => {
    await render(
      <Providers>
        <CrosshairPreview profile={parseCrosshairCode("0;P;c;5").primary} label="Crosshair preview" />
      </Providers>,
    );
    expect(screen.getByLabelText("Crosshair preview")).toBeOnTheScreen();
  });

  it("renders in dark mode", async () => {
    await render(
      <Providers scheme="dark">
        <Button label="Dark" />
      </Providers>,
    );
    expect(screen.getByRole("button", { name: "Dark" })).toBeOnTheScreen();
  });
});

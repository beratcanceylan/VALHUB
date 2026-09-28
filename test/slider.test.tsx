import { fireEvent, render, screen } from "@testing-library/react-native";
import { Slider } from "@/components/ui";
import { Providers } from "./helpers";

jest.mock("expo-haptics", () => ({ selectionAsync: jest.fn(async () => undefined) }));

describe("Slider", () => {
  it("is an adjustable control that steps with accessibility actions", async () => {
    const onChange = jest.fn();
    await render(
      <Providers>
        <Slider label="Offset" value={3} min={0} max={20} step={1} onChange={onChange} />
      </Providers>,
    );
    const slider = screen.getByRole("adjustable", { name: "Offset" });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).toHaveBeenLastCalledWith(4);
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "decrement" } });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("never steps past its bounds and keeps fractional steps exact", async () => {
    const onChange = jest.fn();
    await render(
      <Providers>
        <Slider label="Opacity" value={0.95} min={0} max={1} step={0.05} digits={2} onChange={onChange} />
      </Providers>,
    );
    const slider = screen.getByRole("adjustable", { name: "Opacity" });
    await fireEvent(slider, "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).toHaveBeenLastCalledWith(1);
    onChange.mockClear();
    await render(
      <Providers>
        <Slider label="Max" value={1} min={0} max={1} step={0.05} onChange={onChange} />
      </Providers>,
    );
    await fireEvent(screen.getByRole("adjustable", { name: "Max" }), "accessibilityAction", { nativeEvent: { actionName: "increment" } });
    expect(onChange).not.toHaveBeenCalled();
  });
});

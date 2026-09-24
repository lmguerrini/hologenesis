import { useState, type ComponentProps } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PaneSplitter } from "./pane-splitter";

const defaults = {
  className: "sidebarResizeHandle",
  growKey: "ArrowRight" as const,
  label: "Resize side panel",
  max: 420,
  min: 200,
  onReset: vi.fn(),
  orientation: "vertical" as const,
  dragSign: 1 as const
};

type HarnessProps = Partial<ComponentProps<typeof PaneSplitter>>;

/** Stateful by default so keyboard sequences move the thumb like production. */
function Harness(props: HarnessProps = {}) {
  const [value, setValue] = useState(256);
  const { onCommit = setValue, onLiveChange = () => {}, ...rest } = props;
  return (
    <PaneSplitter
      {...defaults}
      onCommit={onCommit}
      onLiveChange={onLiveChange}
      {...rest}
      value={value}
    />
  );
}

function getSeparator() {
  return screen.getByRole("separator", { name: "Resize side panel" });
}

describe("PaneSplitter", () => {
  it("exposes the separator slider contract", () => {
    render(<Harness />);
    const separator = getSeparator();

    expect(separator).toHaveAttribute("aria-orientation", "vertical");
    expect(separator).toHaveAttribute("aria-valuemin", "200");
    expect(separator).toHaveAttribute("aria-valuemax", "420");
    expect(separator).toHaveAttribute("aria-valuenow", "256");
    expect(separator).toHaveAttribute("tabindex", "0");
    expect(separator).toHaveAttribute("aria-disabled", "false");
  });

  it("keeps disabled splitters out of tab order and inert to keys", () => {
    const onCommit = vi.fn();
    const onReset = vi.fn();
    render(<Harness disabled onCommit={onCommit} onReset={onReset} />);
    const separator = getSeparator();

    expect(separator).toHaveAttribute("tabindex", "-1");
    expect(separator).toHaveAttribute("aria-disabled", "true");

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    fireEvent.keyDown(separator, { key: "Enter" });
    expect(onCommit).not.toHaveBeenCalled();
    expect(onReset).not.toHaveBeenCalled();
  });

  it("grows and shrinks with arrow keys, Shift, Home, End, and Enter", () => {
    const onReset = vi.fn();
    render(<Harness onReset={onReset} />);
    const separator = getSeparator();

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator).toHaveAttribute("aria-valuenow", "272");

    fireEvent.keyDown(separator, { key: "ArrowLeft", shiftKey: true });
    expect(separator).toHaveAttribute("aria-valuenow", "208");

    fireEvent.keyDown(separator, { key: "Home" });
    expect(separator).toHaveAttribute("aria-valuenow", "200");

    fireEvent.keyDown(separator, { key: "End" });
    expect(separator).toHaveAttribute("aria-valuenow", "420");

    fireEvent.keyDown(separator, { key: "Enter" });
    expect(onReset).toHaveBeenCalledOnce();

    // Unrelated keys leave the value untouched.
    fireEvent.keyDown(separator, { key: "c" });
    expect(separator).toHaveAttribute("aria-valuenow", "420");
  });

  it("clamps keyboard growth to the splitter range", () => {
    render(<Harness />);
    const separator = getSeparator();

    fireEvent.keyDown(separator, { key: "End" });
    fireEvent.keyDown(separator, { key: "ArrowRight", shiftKey: true });
    expect(separator).toHaveAttribute("aria-valuenow", "420");

    fireEvent.keyDown(separator, { key: "Home" });
    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator).toHaveAttribute("aria-valuenow", "200");
  });

  it("drags via the mouse fallback, reports live values, and commits on release", async () => {
    const onLiveChange = vi.fn();
    const onDragStateChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <Harness
        onCommit={onCommit}
        onDragStateChange={onDragStateChange}
        onLiveChange={onLiveChange}
      />
    );
    const separator = getSeparator();

    // Driving plain mouse events exercises the fallback drag path directly.
    fireEvent.mouseDown(separator, { clientX: 400, clientY: 0 });
    expect(separator).toHaveAttribute("data-active", "true");
    expect(onDragStateChange).toHaveBeenLastCalledWith(true);

    fireEvent.mouseMove(window, { clientX: 480, clientY: 0 });
    await waitFor(() => expect(onLiveChange).toHaveBeenCalled());
    expect(onLiveChange).toHaveBeenLastCalledWith(336);

    // Beyond the maximum the live value clamps.
    fireEvent.mouseMove(window, { clientX: 2000, clientY: 0 });
    await waitFor(() => expect(onLiveChange).toHaveBeenLastCalledWith(420));

    fireEvent.mouseUp(window);
    expect(separator).not.toHaveAttribute("data-active");
    expect(onDragStateChange).toHaveBeenLastCalledWith(false);
    expect(onCommit).toHaveBeenLastCalledWith(420);
  });

  it("drags with pointer capture when PointerEvent is available", async () => {
    const onLiveChange = vi.fn();
    const onCommit = vi.fn();
    render(<Harness onCommit={onCommit} onLiveChange={onLiveChange} />);
    const separator = getSeparator();

    fireEvent.pointerDown(separator, { clientX: 400, clientY: 0, pointerId: 7 });
    expect(separator).toHaveAttribute("data-active", "true");

    fireEvent.pointerMove(separator, { clientX: 460, clientY: 0, pointerId: 7 });
    await waitFor(() => expect(onLiveChange).toHaveBeenCalled());
    expect(onLiveChange).toHaveBeenLastCalledWith(316);

    // A second pointer's movement is ignored.
    onLiveChange.mockClear();
    fireEvent.pointerMove(separator, { clientX: 900, clientY: 0, pointerId: 9 });
    fireEvent.pointerUp(separator, { clientX: 460, clientY: 0, pointerId: 9 });
    expect(separator).toHaveAttribute("data-active", "true");

    fireEvent.pointerUp(separator, { clientX: 460, clientY: 0, pointerId: 7 });
    expect(separator).not.toHaveAttribute("data-active");
    expect(onCommit).toHaveBeenLastCalledWith(316);
  });

  it("reverses drag direction for panes that grow toward the drag origin", async () => {
    const onLiveChange = vi.fn();
    render(<Harness dragSign={-1} onLiveChange={onLiveChange} />);
    const separator = getSeparator();

    fireEvent.mouseDown(separator, { clientX: 400, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 430, clientY: 0 });
    await waitFor(() => expect(onLiveChange).toHaveBeenCalled());
    expect(onLiveChange).toHaveBeenLastCalledWith(226);
    fireEvent.mouseUp(window);
  });

  it("reverses keyboard direction against the grow key", () => {
    render(<Harness growKey="ArrowLeft" />);
    const separator = getSeparator();

    fireEvent.keyDown(separator, { key: "ArrowLeft" });
    expect(separator).toHaveAttribute("aria-valuenow", "272");

    fireEvent.keyDown(separator, { key: "ArrowRight" });
    expect(separator).toHaveAttribute("aria-valuenow", "256");
  });

  it("resets on double-click but not after a real drag", () => {
    const onReset = vi.fn();
    render(<Harness onReset={onReset} />);
    const separator = getSeparator();

    fireEvent.doubleClick(separator);
    expect(onReset).toHaveBeenCalledOnce();

    fireEvent.mouseDown(separator, { clientX: 400, clientY: 0 });
    fireEvent.mouseMove(window, { clientX: 432, clientY: 0 });
    fireEvent.mouseUp(window);
    fireEvent.doubleClick(separator);
    expect(onReset).toHaveBeenCalledOnce();
  });
});

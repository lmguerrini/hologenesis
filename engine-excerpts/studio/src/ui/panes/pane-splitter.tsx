"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent
} from "react";
import { applyPaneKeyboardStep, paneKeyboardDelta } from "./pane-layout";

type PaneSplitterProps = {
  className: string;
  /** Disabled splitters stay in the accessibility tree but ignore input. */
  disabled?: boolean;
  /** Key whose direction grows the pane (e.g. ArrowLeft for the right rail). */
  growKey: "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp";
  label: string;
  max: number;
  min: number;
  onCommit: (value: number) => void;
  onDragStateChange?: (dragging: boolean) => void;
  onLiveChange: (value: number) => void;
  onReset: () => void;
  orientation: "horizontal" | "vertical";
  /** How pointer travel maps to size: -1 grows toward the drag origin. */
  dragSign: 1 | -1;
  value: number;
};

function clampPaneValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

/**
 * Shared pane separator: keyboard-steppable (arrows ±16, Shift ±64, Home/End,
 * Enter resets), pointer-draggable with capture, and reset by double-click.
 * Live drag values are coalesced into animation frames and the final value is
 * committed on release. Environments without PointerEvent (jsdom) fall back
 * to window mouse events so both contracts stay exercisable.
 */
export function PaneSplitter({
  className,
  disabled = false,
  growKey,
  label,
  max,
  min,
  onCommit,
  onDragStateChange,
  onLiveChange,
  onReset,
  orientation,
  dragSign,
  value
}: PaneSplitterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({
    active: false,
    pointerId: null as number | null,
    startClient: 0,
    startValue: 0,
    usesPointerEvents: false
  });
  const lastTrackedValueRef = useRef<number | null>(null);
  const lastDragMovedRef = useRef(false);
  const pointerDownHandledRef = useRef(false);
  const pendingValueRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const latest = useRef({
    max,
    min,
    onCommit,
    onDragStateChange,
    onLiveChange
  });
  latest.current = { max, min, onCommit, onDragStateChange, onLiveChange };

  const cancelLiveFrame = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    pendingValueRef.current = null;
  }, []);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    if (!drag.active) {
      return;
    }
    drag.active = false;
    drag.pointerId = null;
    pointerDownHandledRef.current = false;
    cleanupRef.current?.();
    cleanupRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    setIsDragging(false);
    latest.current.onDragStateChange?.(false);

    cancelLiveFrame();
    const committed = lastTrackedValueRef.current;
    lastTrackedValueRef.current = null;
    lastDragMovedRef.current = committed !== null && committed !== drag.startValue;
    latest.current.onCommit(committed ?? drag.startValue);
  }, [cancelLiveFrame]);

  // change) must still release the cursor/user-select overrides and the
  // mouse-fallback listeners, and commit the in-flight value.
  useEffect(() => endDrag, [endDrag]);

  const beginDrag = useCallback(
    (
      startClient: number,
      usesPointerEvents: boolean,
      pointerId: number | null
    ) => {
      dragRef.current = {
        active: true,
        pointerId,
        startClient,
        startValue: value,
        usesPointerEvents
      };
      document.body.style.cursor =
        orientation === "vertical" ? "col-resize" : "row-resize";
      document.body.style.userSelect = "none";
      setIsDragging(true);
      latest.current.onDragStateChange?.(true);
    },
    [orientation, value]
  );

  const trackDragPosition = useCallback(
    (clientPosition: number) => {
      const drag = dragRef.current;
      if (!drag.active) {
        return;
      }
      const { max: liveMax, min: liveMin } = latest.current;
      const next = clampPaneValue(
        drag.startValue + (clientPosition - drag.startClient) * dragSign,
        liveMin,
        liveMax
      );
      lastTrackedValueRef.current = next;
      pendingValueRef.current = next;
      if (
        frameRef.current === null &&
        typeof requestAnimationFrame === "function"
      ) {
        frameRef.current = requestAnimationFrame(() => {
          frameRef.current = null;
          const pending = pendingValueRef.current;
          pendingValueRef.current = null;
          if (pending !== null) {
            latest.current.onLiveChange(pending);
          }
        });
      } else if (frameRef.current === null) {
        pendingValueRef.current = null;
        latest.current.onLiveChange(next);
      }
    },
    [dragSign]
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      if (disabled || typeof window.PointerEvent !== "function") {
        return;
      }
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      pointerDownHandledRef.current = true;
      beginDrag(
        orientation === "vertical" ? event.clientX : event.clientY,
        true,
        event.pointerId
      );
    },
    [beginDrag, disabled, orientation]
  );

  const handlePointerMove = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (
        !drag.active ||
        !drag.usesPointerEvents ||
        drag.pointerId !== event.pointerId
      ) {
        return;
      }
      trackDragPosition(
        orientation === "vertical" ? event.clientX : event.clientY
      );
    },
    [orientation, trackDragPosition]
  );

  const handlePointerEnd = useCallback(
    (event: ReactPointerEvent<HTMLElement>) => {
      const drag = dragRef.current;
      if (
        drag.active &&
        drag.usesPointerEvents &&
        drag.pointerId !== null &&
        drag.pointerId !== event.pointerId
      ) {
        // Pointer capture routes only the grabbed pointer here; anything else
        // dispatching at the separator must not end the drag.
        return;
      }
      endDrag();
    },
    [endDrag]
  );

  const handleMouseDown = useCallback(
    (event: ReactMouseEvent<HTMLElement>) => {
      // Real browsers follow pointerdown with mousedown for the same press;
      // only environments driving plain mouse events fall through to here.
      if (disabled || pointerDownHandledRef.current) {
        return;
      }
      event.preventDefault();
      beginDrag(orientation === "vertical" ? event.clientX : event.clientY, false, null);

      const isVertical = orientation === "vertical";
      const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
        trackDragPosition(
          isVertical ? moveEvent.clientX : moveEvent.clientY
        );
      };
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", endDrag, { once: true });
      cleanupRef.current = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", endDrag);
      };
    },
    [beginDrag, disabled, endDrag, orientation, trackDragPosition]
  );


  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>) => {
      if (disabled) {
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onReset();
        return;
      }

      const delta = paneKeyboardDelta(event.key, event.shiftKey);
      if (delta === null) {
        return;
      }
      event.preventDefault();
      const signed =
        delta === "min" || delta === "max" || event.key === growKey
          ? delta
          : -delta;
      onCommit(
        applyPaneKeyboardStep(
          value,
          signed,
          latest.current.min,
          latest.current.max
        )
      );
    },
    [disabled, growKey, onCommit, onReset, value]
  );

  const handleDoubleClick = useCallback(() => {
    // A double-click that ends a real drag is two fast resize nudges, not a reset.
    if (lastDragMovedRef.current) {
      lastDragMovedRef.current = false;
      return;
    }
    onReset();
  }, [onReset]);

  return (
    <div
      aria-disabled={disabled ? "true" : "false"}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemax={max}
      aria-valuemin={min}
      aria-valuenow={value}
      className={className}
      data-active={isDragging ? "true" : undefined}
      data-orientation={orientation}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      onLostPointerCapture={endDrag}
      onMouseDown={handleMouseDown}
      onPointerCancel={handlePointerEnd}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      role="separator"
      tabIndex={disabled ? -1 : 0}
    />
  );
}

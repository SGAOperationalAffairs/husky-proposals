"use client";

import { useEffect, useRef, useState } from "react";

// A press-and-hold button (playground only, for now). One progress value, from 0 to
// 1, drives the fill, the sink, and the shadow. Holding moves it up at the rate it
// takes to hold; letting go moves it back down at the same rate, so a release half
// way drains half way back. Reaching 1 confirms. Keyboard users hold Enter or Space.
const HOLD_MS = 1500;
const SINK_PX = 4;

export function HoldButton({
  label,
  doneLabel,
  onDone,
}: {
  label: string;
  doneLabel: string;
  onDone: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const value = useRef(0);
  const direction = useRef<1 | -1>(-1);
  const running = useRef(false);
  const lastTime = useRef(0);
  const frame = useRef(0);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const step = (now: number) => {
    const dt = now - lastTime.current;
    lastTime.current = now;
    value.current = Math.min(1, Math.max(0, value.current + (direction.current * dt) / HOLD_MS));
    setProgress(value.current);
    if (value.current >= 1) {
      running.current = false;
      setDone(true);
      onDoneRef.current();
      return;
    }
    if (value.current <= 0) {
      running.current = false;
      return;
    }
    frame.current = requestAnimationFrame(step);
  };

  const run = (to: 1 | -1) => {
    direction.current = to;
    if (running.current) return;
    running.current = true;
    lastTime.current = performance.now();
    frame.current = requestAnimationFrame(step);
  };

  const press = () => {
    if (!done) run(1);
  };
  const release = () => {
    if (!done) run(-1);
  };

  const pct = `${Math.round(progress * 100)}%`;
  const text = done ? doneLabel : label;
  const sink = progress * SINK_PX;

  return (
    <button
      type="button"
      aria-describedby="hold-help"
      disabled={done}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && !e.repeat) press();
      }}
      onKeyUp={(e) => {
        if (e.key === "Enter" || e.key === " ") release();
      }}
      style={{
        transform: `translateY(${sink}px)`,
        boxShadow: `0 ${SINK_PX - sink}px 0 var(--accent-text)`,
      }}
      className="relative inline-flex min-w-56 justify-center overflow-hidden border-2 border-accent-text bg-surface px-5 py-3 font-bold text-accent-text select-none disabled:opacity-100"
    >
      {/* Three layers, in order: the accent fill, the label in the button's text color,
          and the same label in white, clipped to the part the fill has covered. */}
      <span aria-hidden className="absolute inset-y-0 left-0 bg-accent" style={{ width: pct }} />
      <span className="relative">{text}</span>
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center font-bold text-on-accent"
        style={{ clipPath: `inset(0 ${100 - progress * 100}% 0 0)` }}
      >
        {text}
      </span>
    </button>
  );
}

export function HoldSection() {
  const [count, setCount] = useState(0);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm">
        Press and hold the button for about a second and a half. It sinks and fills as you hold. Let go early,
        and it rises and drains back at the same rate. Keyboard users hold Enter or Space.
      </p>
      <HoldButton
        label="Take down this idea"
        doneLabel="Taken down (playground only)"
        onDone={() => setCount((c) => c + 1)}
      />
      <p id="hold-help" className="text-sm text-muted">
        Hold for 1.5 seconds to take it down.
      </p>
      <p className="text-sm">
        Confirmed {count} time{count === 1 ? "" : "s"} in this session.
      </p>
    </div>
  );
}

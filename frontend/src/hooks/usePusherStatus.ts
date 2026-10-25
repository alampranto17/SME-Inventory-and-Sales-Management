"use client";

// Tells you if the realtime connection is working.
// Returns: "off" | "connecting" | "connected" | "unavailable" | ...
import { useEffect, useState } from "react";
import { getPusher } from "@/lib/pusher";

export function usePusherStatus() {
  const [status, setStatus] = useState("off");

  useEffect(() => {
    const pusher = getPusher();
    if (!pusher) return;

    // pusher.connection.state is the current state,
    // and "state_change" fires every time it changes
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus(pusher.connection.state);
    const onChange = (states: { current: string }) => setStatus(states.current);
    pusher.connection.bind("state_change", onChange);

    return () => {
      pusher.connection.unbind("state_change", onChange);
    };
  }, []);

  return status;
}

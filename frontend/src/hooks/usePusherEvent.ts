"use client";

// A React hook to listen to ONE Pusher event.
//
// Usage inside any component:
//
//   usePusherEvent(tenantChannel(user), PUSHER_EVENTS.ORDER_CREATED, (data) => {
//     console.log("new order!", data);
//   });
//
// It subscribes when the component appears and cleans up when it goes away.
import { useEffect, useRef } from "react";
import { getPusher } from "@/lib/pusher";

export function usePusherEvent<T = unknown>(
  channelName: string | null,
  eventName: string,
  callback: (data: T) => void,
) {
  // We keep the latest callback in a ref.
  // Then we don't need to re-subscribe every time the component re-renders.
  const callbackRef = useRef(callback);
  useEffect(() => {
    callbackRef.current = callback;
  });

  useEffect(() => {
    const pusher = getPusher();
    if (!pusher || !channelName) return;

    // 1. join the channel (pusher-js re-uses it if already joined)
    const channel = pusher.subscribe(channelName);

    // 2. listen for the event
    const handler = (data: T) => callbackRef.current(data);
    channel.bind(eventName, handler);

    // 3. cleanup: stop listening when the component is removed
    return () => {
      channel.unbind(eventName, handler);
    };
  }, [channelName, eventName]);
}

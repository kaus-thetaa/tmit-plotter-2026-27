"use client";

import { useCallback, useEffect, useState } from "react";

const IDLE_KEY = "tmit-idle-attract-enabled";
const AUDIO_KEY = "tmit-audio-enabled";

const readBool = (key: string, fallback: boolean) => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  return stored === null ? fallback : stored === "true";
};

// settings persisted to localStorage, both default to on
export const useSettings = () => {
  const [idleAttractEnabled, setIdleAttractEnabledState] = useState(true);
  const [audioEnabled, setAudioEnabledState] = useState(true);

  useEffect(() => {
    setIdleAttractEnabledState(readBool(IDLE_KEY, true));
    setAudioEnabledState(readBool(AUDIO_KEY, true));
  }, []);

  const setIdleAttractEnabled = useCallback((value: boolean) => {
    setIdleAttractEnabledState(value);
    window.localStorage.setItem(IDLE_KEY, String(value));
  }, []);

  const setAudioEnabled = useCallback((value: boolean) => {
    setAudioEnabledState(value);
    window.localStorage.setItem(AUDIO_KEY, String(value));
  }, []);

  return { idleAttractEnabled, setIdleAttractEnabled, audioEnabled, setAudioEnabled };
};

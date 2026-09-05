"use client";

import { useEffect, useState } from "react";

// watches the html element's class list directly instead of owning
// its own state, so it stays correct no matter which component
// actually toggles the theme (currently just the task bar)
export const useIsDark = () => {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return isDark;
};

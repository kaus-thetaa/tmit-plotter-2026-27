"use client";

import { useState } from "react";
import { THRUSTMIT_VIDEOS } from "@/lib/config/videos";

type VideoCarouselProps = {
  className?: string;
};

// cycles through every clip in lib/config/videos.ts, one at a time on loop
// object-fit cover means any resolution or aspect ratio just fills the box
export const VideoCarousel = ({ className = "" }: VideoCarouselProps) => {
  const [index, setIndex] = useState(0);

  if (THRUSTMIT_VIDEOS.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-console-panel ${className}`}
      >
        <p className="text-console-muted text-sm px-4 text-center">
          drop mp4 clips into public/videos and list them in
          lib/config/videos.ts
        </p>
      </div>
    );
  }

  return (
    <video
      key={THRUSTMIT_VIDEOS[index]}
      className={`w-full h-full object-cover ${className}`}
      src={THRUSTMIT_VIDEOS[index]}
      autoPlay
      muted
      playsInline
      onEnded={() => setIndex((i) => (i + 1) % THRUSTMIT_VIDEOS.length)}
    />
  );
};

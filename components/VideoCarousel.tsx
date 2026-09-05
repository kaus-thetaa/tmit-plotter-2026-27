"use client";

import { useRef, useState } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  RotateCcw,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { THRUSTMIT_VIDEOS } from "@/lib/config/videos";

type VideoCarouselProps = {
  className?: string;
};

// cycles through every clip in lib/config/videos.ts, basic player
// controls appear on hover: prev, play/pause, next, restart, mute
export const VideoCarousel = ({ className = "" }: VideoCarouselProps) => {
  const [index, setIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  if (THRUSTMIT_VIDEOS.length === 0) {
    return (
      <div
        className={`w-full h-full flex items-center justify-center bg-console-panel ${className}`}
      >
        <p className="text-console-muted text-sm px-4 text-center">
          drop mp4 clips into public/videos and list them in
          lib/config/videos.ts
        </p>
      </div>
    );
  }

  const goTo = (i: number) => {
    const n = THRUSTMIT_VIDEOS.length;
    setIndex(((i % n) + n) % n);
    setIsPlaying(true);
  };

  const handleRestart = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setIsPlaying(true);
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div className={`relative w-full h-full group ${className}`}>
      <video
        ref={videoRef}
        key={THRUSTMIT_VIDEOS[index]}
        className="w-full h-full object-cover"
        src={THRUSTMIT_VIDEOS[index]}
        autoPlay
        muted={isMuted}
        playsInline
        onEnded={() => goTo(index + 1)}
        onError={() => {
          console.warn(`could not load ${THRUSTMIT_VIDEOS[index]}, check the filename`);
          goTo(index + 1);
        }}
      />

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-console-bg/90 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-1">
          <button
            onClick={() => goTo(index - 1)}
            className="text-console-text/80 hover:text-console-text p-1"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlay}
            className="text-console-text/80 hover:text-console-text p-1"
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => goTo(index + 1)}
            className="text-console-text/80 hover:text-console-text p-1"
          >
            <SkipForward size={14} />
          </button>
          <button
            onClick={handleRestart}
            className="text-console-text/80 hover:text-console-text p-1"
          >
            <RotateCcw size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-console-muted text-[10px] font-mono">
            {index + 1}/{THRUSTMIT_VIDEOS.length}
          </span>
          <button
            onClick={() => setIsMuted((m) => !m)}
            className="text-console-text/80 hover:text-console-text p-1"
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
};

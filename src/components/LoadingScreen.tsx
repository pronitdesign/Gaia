"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const SESSION_KEY = "gaia-loading-done";
const FALLBACK_TIMEOUT_MS = 4000;
const EXIT_BEFORE_END_S = 0.5;

export default function LoadingScreen() {
  const [visible, setVisible] = useState(true);
  const [skipped, setSkipped] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(false);

  useEffect(() => {
    // Refresh/primeiro load sempre toca o vídeo; só navegação interna (SPA) pula.
    const onPageHide = () => sessionStorage.removeItem(SESSION_KEY);
    window.addEventListener("pagehide", onPageHide);

    if (sessionStorage.getItem(SESSION_KEY)) {
      setSkipped(true);
      setVisible(false);
      return () => window.removeEventListener("pagehide", onPageHide);
    }

    document.documentElement.classList.add("scroll-locked");

    const finish = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(false);
    };

    const video = videoRef.current;
    if (!video) {
      finish();
      return () => window.removeEventListener("pagehide", onPageHide);
    }

    const fallback = setTimeout(() => {
      if (video.readyState < 2 || video.paused) finish();
    }, FALLBACK_TIMEOUT_MS);

    const onTimeUpdate = () => {
      if (video.duration && video.currentTime >= video.duration - EXIT_BEFORE_END_S) finish();
    };

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", finish);
    video.addEventListener("error", finish);
    video.play().catch(finish);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      clearTimeout(fallback);
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", finish);
      video.removeEventListener("error", finish);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      const t = setTimeout(
        () => document.documentElement.classList.remove("scroll-locked"),
        600
      );
      return () => clearTimeout(t);
    }
  }, [visible]);

  if (skipped) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-100 bg-ink"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <video
            ref={videoRef}
            className="size-full object-cover"
            src="/loading.mp4"
            muted
            playsInline
            preload="auto"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

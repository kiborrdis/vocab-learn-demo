import React, { useState, useRef, type ReactNode } from "react";
import styles from "./SwipeSlider.module.css";

export type SwipeDirection = "left" | "right";

interface SwipeSliderProps {
  onSlideComplete: (direction: SwipeDirection, value: boolean) => void;
  swipeThreshold?: number;
  children: ReactNode;
}

const SwipeSlider = ({ onSlideComplete, swipeThreshold = 100, children }: SwipeSliderProps) => {
  const [animate, setAnimate] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<SwipeDirection | null>(null);
  const [swipeDistance, setSwipeDistance] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleSwipe = (direction: SwipeDirection) => {
    setSwipeDirection(direction);
    setAnimate(true);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      return;
    }

    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) {
      return;
    }

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const dx = currentX - touchStartX.current;

    touchEndY.current = currentY;
    setSwipeDistance(dx);
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchStartY.current || touchEndY.current === null) {
      return;
    }

    setSwipeDistance(0);

    if (swipeDistance > swipeThreshold) {
      handleSwipe("right");
    } else if (swipeDistance < -swipeThreshold) {
      handleSwipe("left");
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  const resetAnimation = (el: HTMLDivElement) => {
    setAnimate(false);
    setSwipeDirection(null);
    if (swipeDirection) {
      const transitionBlock = el.querySelector(
        swipeDirection === "left"
          ? `.${styles.transitionBlockLeft}`
          : `.${styles.transitionBlockRight}`
      );
      let value = false;

      if (transitionBlock) {
        value = (transitionBlock as HTMLDivElement).dataset["value"] === "true";
      }

      onSlideComplete(swipeDirection, value);
    }
  };

  return (
    <div
      className={styles.swipeContainer}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div
        className={`${styles.swipeSlide} ${animate ? styles.animate : ""}`}
        style={{
          transform: animate
            ? swipeDirection === "right"
              ? "translateX(200%)"
              : "translateX(-200%)"
            : `translateX(${swipeDistance}px)`,
        }}
        onTransitionEnd={(e) => {
          if (animate && e.target === e.currentTarget) {
            resetAnimation(e.currentTarget);
          }
        }}
      >
        {children}
      </div>
    </div>
  );
};

function CurrentContent({ children }: { children: ReactNode }) {
  return <div className={styles.currentContent}>{children}</div>;
}
SwipeSlider.CurrentContent = CurrentContent;

function NextContentLeft({ children }: { children: ReactNode }) {
  return <div className={styles.nextContentLeft}>{children}</div>;
}
SwipeSlider.NextContentLeft = NextContentLeft;

function NextContentRight({ children }: { children: ReactNode }) {
  return <div className={styles.nextContentRight}>{children}</div>;
}
SwipeSlider.NextContentRight = NextContentRight;

function TransitionContentRight({ children, value }: { children: ReactNode; value?: boolean }) {
  return (
    <div className={styles.transitionBlockRight} data-value={value}>
      {children}
    </div>
  );
}
SwipeSlider.TransitionContentRight = TransitionContentRight;

function TransitionContentLeft({ children, value }: { children: ReactNode; value?: boolean }) {
  return (
    <div className={styles.transitionBlockLeft} data-value={value}>
      {children}
    </div>
  );
}
SwipeSlider.TransitionContentLeft = TransitionContentLeft;

export default SwipeSlider;

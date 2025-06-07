import React, { useState, useRef } from "react";
import styles from "./DragUpPanel.module.css";

interface DragUpPanelProps {
  children: React.ReactNode;
  isVisible: boolean;
  onVisibilityChange: (visible: boolean) => void;
  dragThreshold?: number;
}

const DragUpPanel: React.FC<DragUpPanelProps> = ({
  children,
  isVisible,
  onVisibilityChange,
  dragThreshold = 50,
}) => {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length !== 1) {
      return;
    }

    setIsDragging(true);
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    e.stopPropagation();
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current || !isDragging) {
      return;
    }

    const currentY = e.touches[0].clientY;
    const dy = currentY - touchStartY.current;

    setSwipeDistance(dy);
    touchEndY.current = currentY;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchStartY.current || touchEndY.current === null || !isDragging) {
      return;
    }

    setSwipeDistance(0);
    setIsDragging(false);

    const dy = touchStartY.current - touchEndY.current;
    if (dy > dragThreshold) {
      // Show panel when swiping up
      onVisibilityChange(true);
    }

    touchStartX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  return (
    <>
      {/* Invisible drag area for opening panel */}
      <div
        className={styles.dragArea}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: isVisible ? 0 : "20%",
          zIndex: 10,
          pointerEvents: isVisible ? "none" : "auto",
        }}
      />

      {/* Panel content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          height: isVisible ? "50%" : isDragging ? Math.max(0, -1 * swipeDistance) + "px" : 0,
          transition: isVisible && !isDragging ? "height 0.3s ease-in-out" : undefined,
        }}
      >
        {children}
      </div>
    </>
  );
};

export default DragUpPanel;

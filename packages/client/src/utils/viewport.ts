// Utility to handle mobile viewport height issues
export function setViewportHeight() {
  // Calculate the actual viewport height
  const vh = window.innerHeight * 0.01;

  // Set the CSS custom property
  document.documentElement.style.setProperty("--vh", `${vh}px`);
}

// Initialize on load and resize
export function initViewportHeight() {
  setViewportHeight();

  // Update on resize (orientation change, etc.)
  window.addEventListener("resize", setViewportHeight);

  // Also listen for orientation change on mobile
  window.addEventListener("orientationchange", () => {
    // Wait a bit for the browser to finish the orientation change
    setTimeout(setViewportHeight, 100);
  });
}

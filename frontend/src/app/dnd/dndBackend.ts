import { HTML5Backend } from "react-dnd-html5-backend";
import { TouchBackend } from "react-dnd-touch-backend";

function isTouchDevice() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia?.("(pointer: coarse)").matches ||
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0
  );
}

export function getDragDropBackend() {
  if (isTouchDevice()) {
    return {
      backend: TouchBackend,
      options: {
        delayTouchStart: 120,
        enableMouseEvents: true,
        ignoreContextMenu: true,
      },
    };
  }

  return {
    backend: HTML5Backend,
  };
}

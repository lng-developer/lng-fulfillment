import type { MouseEvent } from "react";

export function dismissOnBackdrop(
  event: MouseEvent<HTMLElement>,
  onClose: () => void,
  disabled = false,
) {
  if (disabled || event.button !== 0 || event.target !== event.currentTarget) return;
  // Native dialog backdrops target the dialog itself, including clicks on its padding.
  if (event.currentTarget.tagName === "DIALOG") {
    const rect = event.currentTarget.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right &&
        event.clientY >= rect.top && event.clientY <= rect.bottom) return;
  }
  event.stopPropagation();
  onClose();
}

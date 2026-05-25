"use client";

import { toast } from "sonner";

export function toastSuccess(message: string) {
  toast.success(message, {
    duration: 3000,
  });
}

export function toastError(message = "Something went wrong. Please try again.") {
  toast.error(message, {
    duration: 5000,
    dismissible: true,
  });
}

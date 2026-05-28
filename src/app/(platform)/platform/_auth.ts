import { notFound, redirect } from "next/navigation";
import {
  getCurrentUserWithTenants,
  requirePlatformContextFromSession,
} from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function requirePlatformPageActor() {
  const context = await getCurrentUserWithTenants();
  if (!context) {
    redirect("/login");
  }

  try {
    const actor = requirePlatformContextFromSession(context, true);
    return { actor, user: context.user };
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      notFound();
    }

    throw error;
  }
}

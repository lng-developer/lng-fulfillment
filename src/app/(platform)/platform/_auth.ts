import { notFound, redirect } from "next/navigation";
import { getCurrentUser, requirePlatformAccess } from "@/shared/auth/context";
import { AppError } from "@/shared/errors";

export async function requirePlatformPageActor() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  try {
    const actor = await requirePlatformAccess();
    return { actor, user };
  } catch (error) {
    if (error instanceof AppError && error.code === "FORBIDDEN") {
      notFound();
    }

    throw error;
  }
}

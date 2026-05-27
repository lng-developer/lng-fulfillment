import type { ReactNode } from "react";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { requirePlatformPageActor } from "./_auth";

export default async function PlatformLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { actor, user } = await requirePlatformPageActor();

  return <PlatformShell role={actor.role} user={user}>{children}</PlatformShell>;
}

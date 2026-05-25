import type { ApiSuccess, Member } from "@/types/settings";
import { apiFetch } from "./base";

export type UpdateMemberInput = {
  role?: string;
  status?: "ACTIVE" | "DISABLED";
};

export async function getMembers(signal?: AbortSignal): Promise<Member[]> {
  const response = await apiFetch<ApiSuccess<{ members: Member[] }>>(
    "/api/tenants/current/members",
    { signal },
  );

  return response.data.members;
}

export async function listMembers(signal?: AbortSignal) {
  const members = await getMembers(signal);
  return { success: true as const, data: { members } };
}

export async function updateMember(
  membershipId: string,
  input: UpdateMemberInput,
): Promise<Member> {
  const response = await apiFetch<ApiSuccess<{ member: Member }>>(
    `/api/tenants/current/members/${membershipId}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );

  return response.data.member;
}

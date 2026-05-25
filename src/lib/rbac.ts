export type Role = "OWNER" | "ADMIN" | "OPERATOR" | "VIEWER";

export const can = {
  manageApiKeys: (role: Role) => ["OWNER", "ADMIN"].includes(role),
  manageMembers: (role: Role) => ["OWNER", "ADMIN"].includes(role),
  manageCarrierAccounts: (role: Role) => ["OWNER", "ADMIN"].includes(role),
  viewAuditLogs: (role: Role) => ["OWNER", "ADMIN"].includes(role),
  createShipment: (role: Role) =>
    ["OWNER", "ADMIN", "OPERATOR"].includes(role),
  syncTracking: (role: Role) =>
    ["OWNER", "ADMIN", "OPERATOR"].includes(role),
  executeShipment: (role: Role) =>
    ["OWNER", "ADMIN", "OPERATOR"].includes(role),
};

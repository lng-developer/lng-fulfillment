export function canPullTrackingFromPortal(scopes: readonly string[]) {
  return scopes.includes("tracking:write");
}

export type ValidationIssue = {
  path?: string;
  message: string;
};

export type ValidationResult =
  | { valid: true }
  | { valid: false; issues: ValidationIssue[] };

export function valid(): ValidationResult {
  return { valid: true };
}

export function invalid(issues: ValidationIssue[]): ValidationResult {
  return { valid: false, issues };
}

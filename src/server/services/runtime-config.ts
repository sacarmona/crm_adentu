export function missingProductionVariables(input: {
  DATABASE_URL?: string;
  AUTH_SECRET?: string;
  AUTH_URL?: string;
}) {
  return (["DATABASE_URL", "AUTH_SECRET", "AUTH_URL"] as const).filter(
    (key) => !input[key]?.trim(),
  );
}

export function deploymentReadiness(input: {
  missingVariables: string[];
  databaseConnected: boolean;
}) {
  return input.missingVariables.length === 0 && input.databaseConnected;
}

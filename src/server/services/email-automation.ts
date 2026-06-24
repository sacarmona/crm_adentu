export function isAuthorizedCronRequest(input: {
  authorizationHeader: string | null;
  cronSecret?: string;
}) {
  return Boolean(
    input.cronSecret &&
      input.authorizationHeader === `Bearer ${input.cronSecret}`,
  );
}

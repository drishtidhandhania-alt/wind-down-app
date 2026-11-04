type ErrorRecord = Record<string, unknown>;

function asRecord(value: unknown): ErrorRecord | undefined {
  return value !== null && typeof value === 'object'
    ? (value as ErrorRecord)
    : undefined;
}

function getResponseError(error: unknown): string | undefined {
  const data = asRecord(asRecord(error)?.data);
  const message = data?.error;
  if (typeof message !== 'string' || !message.trim()) return undefined;
  return message.trim();
}

export function getServerErrorMessage(error: unknown, fallback: string): string {
  return getResponseError(error) ?? fallback;
}

export function needsAccountGuidance(error: unknown): boolean {
  const record = asRecord(error);
  const status = record?.status;
  const message = getResponseError(error);
  if (!message) return false;

  if (status === 409) {
    return /private tester/i.test(message) && /(connect|link)/i.test(message);
  }

  return status === 401 && /sign[\s-]?in/i.test(message);
}

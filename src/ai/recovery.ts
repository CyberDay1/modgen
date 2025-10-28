export interface ResponseAnalysis {
  sanitized: string;
  length: number;
  isEmpty: boolean;
  isPartial: boolean;
  tooShort: boolean;
  missingClosures: string[];
  unclosedCodeFence: boolean;
  hasDanglingEnding: boolean;
  hasUnclosedQuote: boolean;
  reasons: string[];
}

export interface RecoveryOptions {
  /** Minimum number of characters required for a response to be considered valid. */
  minContentLength?: number;
  /** When true, partial responses are allowed and will not trigger retries. */
  allowPartial?: boolean;
}

export interface RecoveryOutcome {
  original: string;
  originalAnalysis: ResponseAnalysis;
  recovered: string;
  recoveredAnalysis: ResponseAnalysis;
  needsRetry: boolean;
  reason?: string;
}

export interface RetryEvent {
  attempt: number;
  maxRetries: number;
  outcome?: RecoveryOutcome;
  error?: Error;
}

export interface RetryOptions extends RecoveryOptions {
  maxRetries?: number;
  onRetry?: (event: RetryEvent) => void;
}

export interface RecoveryAttemptSnapshot extends RecoveryOutcome {
  attempt: number;
  error?: Error;
}

export interface RetryResult extends RecoveryOutcome {
  attemptCount: number;
  exhausted: boolean;
  attempts: RecoveryAttemptSnapshot[];
  errors: Error[];
}

export class RetryLimitExceeded extends Error {
  public readonly attempts: number;
  public readonly errors: Error[];

  constructor(message: string, attempts: number, errors: Error[]) {
    super(message);
    this.name = 'RetryLimitExceeded';
    this.attempts = attempts;
    this.errors = errors;
  }
}

export function sanitize(text: string): string {
  return text?.trim?.() ?? '';
}

const BRACKET_PAIRS: Array<[string, string]> = [
  ['{', '}'],
  ['[', ']'],
  ['(', ')'],
];

const DANGLING_END_PATTERN = /[,:;\-\[{(<]$/;

function escapeRegex(char: string): string {
  return char.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
}

function countOccurrences(source: string, char: string): number {
  if (!source) return 0;
  const pattern = new RegExp(escapeRegex(char), 'g');
  return (source.match(pattern) ?? []).length;
}

function analyseBrackets(text: string, reasons: string[], missingClosures: string[]): void {
  for (const [open, close] of BRACKET_PAIRS) {
    const openCount = countOccurrences(text, open);
    const closeCount = countOccurrences(text, close);
    const diff = openCount - closeCount;

    if (diff > 0) {
      missingClosures.push(close.repeat(diff));
      reasons.push(`Missing ${diff} closing \`${close}\` character${diff > 1 ? 's' : ''}.`);
    } else if (diff < 0) {
      reasons.push(`Detected ${Math.abs(diff)} extra closing \`${close}\` character${diff < -1 ? 's' : ''}.`);
    }
  }
}

function hasDanglingEnding(text: string): boolean {
  return DANGLING_END_PATTERN.test(text);
}

function hasUnclosedQuote(text: string): boolean {
  return countOccurrences(text, '"') % 2 === 1;
}

function hasUnclosedCodeFence(text: string): boolean {
  return countOccurrences(text, '```') % 2 === 1;
}

export function analyzeResponse(text: string, minContentLength = 0): ResponseAnalysis {
  const sanitized = sanitize(text);

  if (!sanitized) {
    return {
      sanitized,
      length: 0,
      isEmpty: true,
      isPartial: false,
      tooShort: minContentLength > 0,
      missingClosures: [],
      unclosedCodeFence: false,
      hasDanglingEnding: false,
      hasUnclosedQuote: false,
      reasons: ['Response is empty.'],
    };
  }

  const reasons: string[] = [];
  const missingClosures: string[] = [];

  analyseBrackets(sanitized, reasons, missingClosures);

  const unclosedCodeFence = hasUnclosedCodeFence(sanitized);
  if (unclosedCodeFence) {
    reasons.push('Unclosed markdown code fence detected.');
  }

  const danglingEnding = hasDanglingEnding(sanitized);
  if (danglingEnding) {
    reasons.push('Response appears to end abruptly.');
  }

  const unclosedQuote = hasUnclosedQuote(sanitized);
  if (unclosedQuote) {
    reasons.push('Unbalanced double quotes detected.');
  }

  const tooShort = sanitized.length < minContentLength;
  if (tooShort) {
    reasons.push(
      `Response length (${sanitized.length}) is shorter than the minimum of ${minContentLength}.`,
    );
  }

  const isPartial = Boolean(
    missingClosures.length || unclosedCodeFence || danglingEnding || unclosedQuote,
  );

  return {
    sanitized,
    length: sanitized.length,
    isEmpty: false,
    isPartial,
    tooShort,
    missingClosures,
    unclosedCodeFence,
    hasDanglingEnding: danglingEnding,
    hasUnclosedQuote: unclosedQuote,
    reasons,
  };
}

function balanceBrackets(text: string): string {
  let result = text;
  for (const [open, close] of BRACKET_PAIRS) {
    const openCount = countOccurrences(result, open);
    const closeCount = countOccurrences(result, close);
    const diff = openCount - closeCount;
    if (diff > 0) {
      result += close.repeat(diff);
    }
  }
  return result;
}

function closeDanglingEnding(text: string): string {
  if (!text) return text;
  if (!hasDanglingEnding(text)) {
    return text;
  }
  return text.replace(/[,:;\-\[{(<]+$/g, '').trimEnd();
}

function closeUnclosedQuote(text: string): string {
  if (!text) return text;
  return hasUnclosedQuote(text) ? `${text}"` : text;
}

function closeCodeFence(text: string): string {
  if (!text) return text;
  return hasUnclosedCodeFence(text) ? `${text}\n\`\`\`` : text;
}

export function repairPartialResponse(text: string): string {
  let repaired = sanitize(text);

  if (!repaired) {
    return repaired;
  }

  repaired = balanceBrackets(repaired);
  repaired = closeCodeFence(repaired);
  repaired = closeUnclosedQuote(repaired);
  repaired = closeDanglingEnding(repaired);

  return repaired;
}

export function recoverResponse(text: string, options: RecoveryOptions = {}): RecoveryOutcome {
  const minContentLength = options.minContentLength ?? 0;
  const original = text ?? '';
  const originalAnalysis = analyzeResponse(original, minContentLength);

  let recovered = originalAnalysis.sanitized;
  if (originalAnalysis.isPartial) {
    recovered = repairPartialResponse(recovered);
  }

  const recoveredAnalysis = analyzeResponse(recovered, minContentLength);

  const needsRetry = Boolean(
    recoveredAnalysis.isEmpty ||
      recoveredAnalysis.tooShort ||
      (recoveredAnalysis.isPartial && options.allowPartial !== true),
  );

  const reason =
    recoveredAnalysis.reasons[0] ??
    (needsRetry ? 'Response did not meet validation criteria.' : undefined);

  return {
    original,
    originalAnalysis,
    recovered,
    recoveredAnalysis,
    needsRetry,
    reason,
  };
}

export async function recoverWithRetries(
  fetchResponse: () => Promise<string>,
  options: RetryOptions = {},
): Promise<RetryResult> {
  const { onRetry, maxRetries: maxRetriesOption, ...recoveryOptions } = options;
  const maxRetries = Math.max(1, maxRetriesOption ?? 3);
  const minContentLength = recoveryOptions.minContentLength ?? 0;
  const attempts: RecoveryAttemptSnapshot[] = [];
  const errors: Error[] = [];

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
        const raw = await fetchResponse();
        const outcome = recoverResponse(raw, { ...recoveryOptions, minContentLength });
        attempts.push({ ...outcome, attempt });

      if (!outcome.needsRetry) {
        return {
          ...outcome,
          attemptCount: attempt,
          exhausted: false,
          attempts,
          errors,
        };
      }

      if (attempt === maxRetries) {
        return {
          ...outcome,
          attemptCount: attempt,
          exhausted: true,
          attempts,
          errors,
        };
      }

        onRetry?.({ attempt, maxRetries, outcome });
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        errors.push(error);
        onRetry?.({ attempt, maxRetries, error });

      if (attempt === maxRetries) {
        throw new RetryLimitExceeded(
          `Failed to recover response after ${maxRetries} attempts.`,
          attempt,
          errors,
        );
      }
    }
  }

  throw new RetryLimitExceeded('Unexpected retry state.', maxRetries, errors);
}

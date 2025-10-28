import { spawn } from 'child_process';

export type GradleArgs = string[];

export interface GradleRunResult {
  code: number;
  signal: NodeJS.Signals | null;
}

export interface GradleRunOptions {
  /**
   * Working directory where the Gradle wrapper script lives.
   */
  cwd: string;
  /**
   * Arguments passed to the Gradle wrapper. Defaults to the standard build task.
   */
  args?: GradleArgs;
  /**
   * Environment variables to use when spawning the Gradle process.
   */
  env?: NodeJS.ProcessEnv;
}

const DEFAULT_ARGS: GradleArgs = ['build'];

function getGradleWrapperName(): string {
  return process.platform === 'win32' ? 'gradlew.bat' : './gradlew';
}

export function runGradle(cwd: string, args: string[] = DEFAULT_ARGS): Promise<GradleRunResult>;
export function runGradle(options: GradleRunOptions): Promise<GradleRunResult>;
export function runGradle(
  cwdOrOptions: string | GradleRunOptions,
  maybeArgs: string[] = DEFAULT_ARGS
): Promise<GradleRunResult> {
  const options: GradleRunOptions =
    typeof cwdOrOptions === 'string'
      ? { cwd: cwdOrOptions, args: maybeArgs }
      : { ...cwdOrOptions, args: cwdOrOptions.args ?? DEFAULT_ARGS };

  const gradleExecutable = getGradleWrapperName();

  return new Promise<GradleRunResult>((resolve, reject) => {
    const child = spawn(gradleExecutable, options.args ?? DEFAULT_ARGS, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: 'inherit',
      shell: process.platform === 'win32' && gradleExecutable.endsWith('.bat')
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve({ code: code ?? 0, signal });
        return;
      }

      const gradleError = new Error(
        `Gradle wrapper exited with ${
          typeof code === 'number' ? `code ${code}` : `signal ${signal}`
        }`
      ) as NodeJS.ErrnoException & { exitCode?: number; signal?: NodeJS.Signals | null };

      gradleError.code = typeof code === 'number' ? String(code) : gradleError.code;
      gradleError.exitCode = code === null ? undefined : code;
      gradleError.signal = signal;

      reject(gradleError);
    });
  });
}

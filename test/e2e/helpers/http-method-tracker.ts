import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export type HttpMethodResult = {
  method: string;
  path: string;
  expectedStatus: number | number[];
  actualStatus: number;
  ok: boolean;
  durationMs: number;
  error?: string;
};

export class HttpMethodTracker {
  private readonly results: HttpMethodResult[] = [];

  add(result: HttpMethodResult): void {
    this.results.push(result);
  }

  summary(): { total: number; passed: number; failed: number } {
    const total = this.results.length;
    const passed = this.results.filter((item) => item.ok).length;
    const failed = total - passed;
    return { total, passed, failed };
  }

  writeJsonReport(filePath: string): void {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(
      filePath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          summary: this.summary(),
          methods: this.results,
        },
        null,
        2,
      ),
      'utf-8',
    );
  }

  printConsoleSummary(): void {
    const { total, passed, failed } = this.summary();
    // eslint-disable-next-line no-console
    console.log(
      `[E2E HTTP] total=${total} passed=${passed} failed=${failed}`,
    );

    for (const result of this.results) {
      const expected = Array.isArray(result.expectedStatus)
        ? result.expectedStatus.join('|')
        : String(result.expectedStatus);
      const status = result.ok ? 'PASS' : 'FAIL';
      // eslint-disable-next-line no-console
      console.log(
        `[E2E HTTP] ${status} ${result.method} ${result.path} expected=${expected} actual=${result.actualStatus} duration=${result.durationMs}ms${result.error ? ` error=${result.error}` : ''}`,
      );
    }
  }
}

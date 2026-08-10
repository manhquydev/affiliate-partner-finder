/** Strip esbuild/tsx keep-name helpers so fn.toString() is safe for page.evaluate. */

export function toInjectableSource(fn: (...args: never[]) => unknown): string {
  let src = fn.toString();
  const marker = '__name(';
  while (src.includes(marker)) {
    const start = src.indexOf(marker);
    let i = start + marker.length;
    let depth = 1;
    while (i < src.length && depth > 0) {
      const ch = src[i++];
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
    }
    const inner = src.slice(start + marker.length, i - 1);
    let depth2 = 0;
    let split = -1;
    for (let j = 0; j < inner.length; j++) {
      const c = inner[j]!;
      if (c === '(' || c === '{' || c === '[') depth2++;
      else if (c === ')' || c === '}' || c === ']') depth2--;
      else if (c === ',' && depth2 === 0) split = j;
    }
    if (split < 0) {
      throw new Error('unexpected __name(...) form in injectable source');
    }
    const expr = inner.slice(0, split);
    src = src.slice(0, start) + expr + src.slice(i);
  }
  return src;
}

export async function evaluateInjectable<T>(
  page: import('playwright').Page,
  fn: (...args: never[]) => T | Promise<T>,
  ...args: unknown[]
): Promise<T> {
  const src = toInjectableSource(fn as (...args: never[]) => unknown);
  const expr = `(${src}).apply(null, ${JSON.stringify(args)})`;
  return page.evaluate(expr) as Promise<T>;
}

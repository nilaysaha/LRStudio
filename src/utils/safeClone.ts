/**
 * Safe object deep cloning and JSON serialization
 * Handles circular references, DOM nodes, functions, and non-serializable objects gracefully.
 */

export function safeClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as unknown as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    const copyArr: any[] = [];
    for (let i = 0; i < obj.length; i++) {
      copyArr[i] = safeClone(obj[i]);
    }
    return copyArr as unknown as T;
  }

  // If object is a DOM node or Event, skip
  if (typeof window !== 'undefined' && (obj instanceof Node || obj instanceof Event)) {
    return null as unknown as T;
  }

  // Handle plain objects
  const copyObj: Record<string, any> = {};
  const seen = new WeakSet();
  seen.add(obj as object);

  for (const key of Object.keys(obj as object)) {
    try {
      const val = (obj as any)[key];
      if (typeof val === 'function') continue;
      if (val && typeof val === 'object') {
        if (seen.has(val)) {
          // Circular ref skipped
          continue;
        }
        seen.add(val);
      }
      copyObj[key] = safeClone(val);
    } catch {
      // Ignore non-clonable keys
    }
  }

  return copyObj as T;
}

export function safeJsonStringify(value: any, space?: number | string): string {
  const seen = new WeakSet();
  try {
    return JSON.stringify(
      value,
      (key, val) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
          // Omit DOM nodes or File objects if they cause issues
          if (typeof window !== 'undefined' && val instanceof Node) {
            return '[DOM Node]';
          }
        }
        return val;
      },
      space
    );
  } catch (err) {
    return String(value);
  }
}

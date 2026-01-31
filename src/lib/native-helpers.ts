/**
 * Native JavaScript helpers to replace lodash
 * ~70KB bundle size savings by using native implementations
 */

// ==================== DEBOUNCE ====================
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
}

// ==================== THROTTLE ====================
export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

// ==================== DEEP CLONE ====================
export function cloneDeep<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }
  
  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map(item => cloneDeep(item)) as T;
  }
  
  // Handle Object
  const cloned = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = cloneDeep(obj[key]);
    }
  }
  
  return cloned;
}

// ==================== GROUP BY ====================
export function groupBy<T>(
  array: T[],
  keyGetter: ((item: T) => string) | keyof T
): Record<string, T[]> {
  const getKey = typeof keyGetter === 'function' 
    ? keyGetter 
    : (item: T) => String(item[keyGetter]);
    
  return array.reduce((result, item) => {
    const key = getKey(item);
    (result[key] = result[key] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// ==================== UNIQUE BY ====================
export function uniqBy<T>(
  array: T[],
  keyGetter: ((item: T) => unknown) | keyof T
): T[] {
  const getKey = typeof keyGetter === 'function'
    ? keyGetter
    : (item: T) => item[keyGetter];
    
  const seen = new Set();
  return array.filter(item => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// ==================== SORT BY ====================
export function sortBy<T>(
  array: T[],
  ...keys: (keyof T | ((item: T) => unknown))[]
): T[] {
  return [...array].sort((a, b) => {
    for (const key of keys) {
      const getVal = typeof key === 'function' ? key : (item: T) => item[key];
      const aVal = getVal(a) as string | number | boolean | null | undefined;
      const bVal = getVal(b) as string | number | boolean | null | undefined;
      
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (aVal < bVal) return -1;
      if (aVal > bVal) return 1;
    }
    return 0;
  });
}

// ==================== ORDER BY ====================
export function orderBy<T>(
  array: T[],
  keys: (keyof T | ((item: T) => unknown))[],
  orders: ('asc' | 'desc')[] = []
): T[] {
  return [...array].sort((a, b) => {
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const order = orders[i] || 'asc';
      const getVal = typeof key === 'function' ? key : (item: T) => item[key];
      const aVal = getVal(a) as string | number | boolean | null | undefined;
      const bVal = getVal(b) as string | number | boolean | null | undefined;
      
      const multiplier = order === 'desc' ? -1 : 1;
      
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return 1 * multiplier;
      if (bVal == null) return -1 * multiplier;
      if (aVal < bVal) return -1 * multiplier;
      if (aVal > bVal) return 1 * multiplier;
    }
    return 0;
  });
}

// ==================== CHUNK ====================
export function chunk<T>(array: T[], size: number): T[][] {
  if (size <= 0) return [];
  
  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// ==================== FLATTEN ====================
export function flatten<T>(array: (T | T[])[]): T[] {
  return array.flat() as T[];
}

export function flattenDeep<T>(array: unknown[]): T[] {
  return array.flat(Infinity) as T[];
}

// ==================== PICK ====================
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

// ==================== OMIT ====================
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

// ==================== GET (safe nested access) ====================
export function get<T>(
  obj: unknown,
  path: string | (string | number)[],
  defaultValue?: T
): T | undefined {
  const keys = Array.isArray(path) ? path : path.split('.');
  let result: unknown = obj;
  
  for (const key of keys) {
    if (result == null) {
      return defaultValue;
    }
    result = (result as Record<string | number, unknown>)[key];
  }
  
  return (result === undefined ? defaultValue : result) as T;
}

// ==================== SET (safe nested assignment) ====================
export function set<T extends object>(
  obj: T,
  path: string | (string | number)[],
  value: unknown
): T {
  const keys = Array.isArray(path) ? path : path.split('.');
  const clone = cloneDeep(obj);
  let current: Record<string | number, unknown> = clone as Record<string | number, unknown>;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || current[key] == null) {
      current[key] = typeof keys[i + 1] === 'number' ? [] : {};
    }
    current = current[key] as Record<string | number, unknown>;
  }
  
  current[keys[keys.length - 1]] = value;
  return clone;
}

// ==================== MERGE ====================
export function merge<T extends object>(...objects: Partial<T>[]): T {
  const result = {} as T;
  
  for (const obj of objects) {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key as keyof T];
        const existing = result[key as keyof T];
        
        if (
          typeof value === 'object' &&
          value !== null &&
          !Array.isArray(value) &&
          typeof existing === 'object' &&
          existing !== null &&
          !Array.isArray(existing)
        ) {
          result[key as keyof T] = merge(
            existing as object,
            value as object
          ) as T[keyof T];
        } else {
          result[key as keyof T] = value as T[keyof T];
        }
      }
    }
  }
  
  return result;
}

// ==================== IS EMPTY ====================
export function isEmpty(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (value instanceof Map || value instanceof Set) return value.size === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

// ==================== IS EQUAL (shallow) ====================
export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a == null || b == null) return a === b;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }
  
  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    return keysA.every(key => 
      isEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key]
      )
    );
  }
  
  return false;
}

// ==================== CAPITALIZE ====================
export function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ==================== KEBAB CASE ====================
export function kebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

// ==================== CAMEL CASE ====================
export function camelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[-_\s](.)/g, (_, char) => char.toUpperCase());
}

// ==================== TRUNCATE ====================
export function truncate(str: string, length: number, suffix = '...'): string {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
}

// ==================== RANGE ====================
export function range(start: number, end?: number, step = 1): number[] {
  if (end === undefined) {
    end = start;
    start = 0;
  }
  
  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

// ==================== SUM ====================
export function sum(array: number[]): number {
  return array.reduce((acc, val) => acc + val, 0);
}

// ==================== AVERAGE ====================
export function average(array: number[]): number {
  if (array.length === 0) return 0;
  return sum(array) / array.length;
}

// ==================== MIN BY / MAX BY ====================
export function minBy<T>(
  array: T[],
  iteratee: ((item: T) => number) | keyof T
): T | undefined {
  if (array.length === 0) return undefined;
  
  const getVal = typeof iteratee === 'function'
    ? iteratee
    : (item: T) => item[iteratee] as number;
    
  return array.reduce((min, item) => 
    getVal(item) < getVal(min) ? item : min
  );
}

export function maxBy<T>(
  array: T[],
  iteratee: ((item: T) => number) | keyof T
): T | undefined {
  if (array.length === 0) return undefined;
  
  const getVal = typeof iteratee === 'function'
    ? iteratee
    : (item: T) => item[iteratee] as number;
    
  return array.reduce((max, item) => 
    getVal(item) > getVal(max) ? item : max
  );
}

// ==================== KEY BY ====================
export function keyBy<T>(
  array: T[],
  keyGetter: ((item: T) => string) | keyof T
): Record<string, T> {
  const getKey = typeof keyGetter === 'function'
    ? keyGetter
    : (item: T) => String(item[keyGetter]);
    
  return array.reduce((result, item) => {
    result[getKey(item)] = item;
    return result;
  }, {} as Record<string, T>);
}

// ==================== MEMOIZE ====================
export function memoize<T extends (...args: unknown[]) => unknown>(
  fn: T,
  resolver?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  const memoized = (...args: Parameters<T>) => {
    const key = resolver ? resolver(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn(...args) as ReturnType<T>;
    cache.set(key, result);
    return result;
  };
  
  return memoized as T;
}

// ==================== ONCE ====================
export function once<T extends (...args: unknown[]) => unknown>(fn: T): T {
  let called = false;
  let result: ReturnType<T>;
  
  return ((...args: Parameters<T>) => {
    if (!called) {
      called = true;
      result = fn(...args) as ReturnType<T>;
    }
    return result;
  }) as T;
}

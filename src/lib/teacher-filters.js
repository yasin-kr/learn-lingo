import options from './teacher-options.json';

const filterOptions = {
  language: new Set(options.languages),
  level: new Set(options.levels),
  maxPrice: new Set(options.prices.map(String)),
};

export function normalizeTeacherFilters(searchParams) {
  const next = new URLSearchParams(searchParams);
  for (const [key, values] of Object.entries(filterOptions)) {
    const value = next.get(key);
    if (values.has(value)) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

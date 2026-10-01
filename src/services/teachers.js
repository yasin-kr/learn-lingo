import { databaseURL, firebaseConfigurationError } from '../lib/firebase';
import options from '../lib/teacher-options.json';

async function readTeacherBatch(cursor, batchSize, signal) {
  const url = new URL(`${databaseURL}/teachers.json`);
  const requestedLimit = batchSize + (cursor ? 1 : 0);
  url.searchParams.set('orderBy', JSON.stringify('$key'));
  url.searchParams.set('limitToFirst', String(requestedLimit));
  if (cursor) url.searchParams.set('startAt', JSON.stringify(cursor));

  const response = await fetch(url, { cache: 'no-cache', signal });
  if (!response.ok) {
    throw new Error('We could not load the teachers. Please try again.');
  }

  const data = await response.json();
  const entries = Object.entries(data ?? {}).sort(([first], [second]) =>
    first.localeCompare(second),
  );

  return {
    teachers: entries
      .filter(([id]) => !cursor || id > cursor)
      .map(([id, teacher]) => ({ ...teacher, id })),
    exhausted: entries.length < requestedLimit,
  };
}

export async function getTeachers({
  language = '',
  level = '',
  maxPrice = '',
  favoriteIds = null,
  cursor = null,
  limit = 4,
  signal,
} = {}) {
  if (firebaseConfigurationError) {
    throw new Error(firebaseConfigurationError);
  }

  const favoriteSet = favoriteIds === null ? null : new Set(favoriteIds);
  if (favoriteSet?.size === 0) {
    return { teachers: [], hasMore: false, nextCursor: null, options };
  }

  const batchSize =
    language || level || maxPrice || favoriteSet ? 20 : limit + 1;
  const matches = [];
  let scanCursor = cursor;

  while (matches.length <= limit) {
    signal?.throwIfAborted();
    const batch = await readTeacherBatch(scanCursor, batchSize, signal);

    for (const teacher of batch.teachers) {
      if (
        (!language || teacher.languages.includes(language)) &&
        (!level || teacher.levels.includes(level)) &&
        (!maxPrice || teacher.price_per_hour <= Number(maxPrice)) &&
        (!favoriteSet || favoriteSet.has(teacher.id))
      ) {
        matches.push(teacher);
        if (matches.length > limit) break;
      }
    }

    if (matches.length > limit || batch.exhausted || !batch.teachers.length)
      break;
    scanCursor = batch.teachers.at(-1).id;
  }

  const teachers = matches.slice(0, limit);
  const hasMore = matches.length > limit;
  return {
    teachers,
    hasMore,
    nextCursor: hasMore ? teachers.at(-1).id : null,
    options,
  };
}

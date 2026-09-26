function normalizeTeachers(data) {
  return Object.entries(data).map(([key, teacher]) => ({
    ...teacher,
    id: String(
      teacher.id ?? (Array.isArray(data) ? `teacher-${Number(key) + 1}` : key),
    ),
  }));
}

export async function getTeachers({
  language = '',
  level = '',
  maxPrice = '',
  favoriteIds = null,
  offset = 0,
  limit = 4,
  signal,
} = {}) {
  const response = await fetch(
    `${import.meta.env.BASE_URL}data/teachers.json`,
    {
      cache: 'no-cache',
      signal,
    },
  );

  if (!response.ok) {
    throw new Error('We could not load the teachers. Please try again.');
  }

  const data = await response.json();
  const teachers = normalizeTeachers(data.teachers ?? data);
  const favoriteSet = favoriteIds === null ? null : new Set(favoriteIds);
  const filtered = teachers.filter((teacher) => {
    return (
      (!language || teacher.languages.includes(language)) &&
      (!level || teacher.levels.includes(level)) &&
      (!maxPrice || teacher.price_per_hour <= Number(maxPrice)) &&
      (!favoriteSet || favoriteSet.has(teacher.id))
    );
  });

  return {
    teachers: filtered.slice(offset, offset + limit),
    total: filtered.length,
    hasMore: offset + limit < filtered.length,
    options: {
      languages: [
        ...new Set(teachers.flatMap((teacher) => teacher.languages)),
      ].sort(),
      levels: [
        ...new Set(teachers.flatMap((teacher) => teacher.levels)),
      ].sort(),
      prices: [
        ...new Set(teachers.map((teacher) => teacher.price_per_hour)),
      ].sort((first, second) => first - second),
    },
  };
}

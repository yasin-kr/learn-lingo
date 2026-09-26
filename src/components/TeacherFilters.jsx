import Icon from './Icon';

export default function TeacherFilters({
  filters,
  options,
  onChange,
  onReset,
}) {
  const hasFilters = Boolean(
    filters.language || filters.level || filters.maxPrice,
  );

  return (
    <form
      className="teacher-filters"
      aria-label="Filter teachers"
      onSubmit={(event) => event.preventDefault()}
    >
      <label className="teacher-filter teacher-filter-language">
        <span>Languages</span>
        <span className="teacher-select-wrap">
          <select
            name="language"
            value={filters.language}
            onChange={(event) => onChange('language', event.target.value)}
          >
            <option value="">All languages</option>
            {options.languages.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={18} />
        </span>
      </label>

      <label className="teacher-filter teacher-filter-level">
        <span>Level of knowledge</span>
        <span className="teacher-select-wrap">
          <select
            name="level"
            value={filters.level}
            onChange={(event) => onChange('level', event.target.value)}
          >
            <option value="">All levels</option>
            {options.levels.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={18} />
        </span>
      </label>

      <label className="teacher-filter teacher-filter-price">
        <span>Price / hour</span>
        <span className="teacher-select-wrap">
          <select
            name="maxPrice"
            value={filters.maxPrice}
            onChange={(event) => onChange('maxPrice', event.target.value)}
          >
            <option value="">Any price</option>
            {options.prices.map((price) => (
              <option key={price} value={price}>
                Up to ${price}
              </option>
            ))}
          </select>
          <Icon name="chevron-down" size={18} />
        </span>
      </label>

      {hasFilters && (
        <button
          className="teacher-filter-reset"
          type="button"
          onClick={onReset}
        >
          Reset filters
          <Icon name="x" size={16} />
        </button>
      )}
    </form>
  );
}

interface MultiselectFilterProps<T extends string | number> {
  label: string;
  options: T[];
  selection: T[] | null;
  onChange: (selection: T[] | null) => void;
  formatOption?: (option: T) => string;
}

export function MultiselectFilter<T extends string | number>({
  label,
  options,
  selection,
  onChange,
  formatOption = option => String(option),
}: MultiselectFilterProps<T>) {
  const selected = selection ?? options;
  const allSelected = selection === null ||
    (options.length > 0 && options.every(option => selected.includes(option)));

  const summary = allSelected
    ? `Alle ${label}`
    : selected.length === 0
    ? `Keine ${label}`
    : selected.length === 1
    ? formatOption(selected[0])
    : `${selected.length} ${label} ausgewählt`;

  return (
    <details
      className="glass-panel multiselect-filter"
      onKeyDown={e => {
        if (e.key === 'Escape') {
          e.currentTarget.open = false;
          e.currentTarget.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label={`${label} auswählen`}>{summary}</summary>
      <div className="multiselect-filter-menu">
        <div className="multiselect-filter-actions">
          <button
            type="button"
            className="btn"
            disabled={allSelected}
            onClick={() => onChange(null)}
          >
            Alle auswählen
          </button>
          <button
            type="button"
            className="btn"
            disabled={selected.length === 0}
            onClick={() => onChange([])}
          >
            Keine auswählen
          </button>
        </div>
        <fieldset className="multiselect-filter-options">
          <legend>{label} auswählen</legend>
          {options.map(option => (
            <label key={option} className="multiselect-filter-option">
              <input
                type="checkbox"
                checked={selected.includes(option)}
                onChange={e => onChange(e.target.checked
                  ? [...selected, option]
                  : selected.filter(value => value !== option))}
              />
              <span>{formatOption(option)}</span>
            </label>
          ))}
        </fieldset>
      </div>
    </details>
  );
}

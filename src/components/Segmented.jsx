export default function Segmented({ label, options, value, onChange }) {
  const index = Math.max(0, options.findIndex((o) => o.id === value));
  return (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="group" aria-label={label} style={{ '--n': options.length, '--i': index }}>
        <span className="thumb" aria-hidden="true" />
        {options.map((o) => (
          <button key={o.id} type="button" aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

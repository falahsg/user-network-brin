import { useEffect, useId, useRef, useState } from 'react';
import { Check, Chevron } from './Icons.jsx';

const CLOSE_MS = 140;

// Dropdown daftar pilihan.
export default function Select({ label, options, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);
  const listRef = useRef(null);
  const btnRef = useRef(null);
  const id = useId();

  const selectedIndex = Math.max(0, options.findIndex((o) => o.id === value));
  const current = options[selectedIndex];

  const show = () => {
    setActive(selectedIndex);
    setOpen(true);
  };
  const hide = (refocus) => {
    setLeaving(true);
    setTimeout(() => {
      setOpen(false);
      setLeaving(false);
      if (refocus) btnRef.current?.focus();
    }, CLOSE_MS);
  };
  const choose = (i) => {
    onChange(options[i].id);
    hide(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    listRef.current?.focus({ preventScroll: true });
    const onDown = (e) => {
      if (!rootRef.current.contains(e.target)) hide(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [open]);

  const onListKey = (e) => {
    const last = options.length - 1;
    const keys = {
      ArrowDown: () => setActive((a) => Math.min(a + 1, last)),
      ArrowUp: () => setActive((a) => Math.max(a - 1, 0)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => choose(active),
      ' ': () => choose(active),
      Escape: () => hide(true),
      Tab: () => hide(false),
    };
    if (keys[e.key]) {
      if (e.key !== 'Tab') e.preventDefault();
      keys[e.key]();
    }
  };

  return (
    <div className="field" ref={rootRef}>
      <span className="field-label" id={`${id}-label`}>{label}</span>
      <div className="select">
        <button
          ref={btnRef}
          type="button"
          className="select-btn"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-labelledby={`${id}-label ${id}-btn`}
          id={`${id}-btn`}
          onClick={() => (open ? hide(false) : show())}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault();
              if (!open) show();
            }
          }}
        >
          <span key={current.id} className="select-value">{current.label}</span>
          <Chevron className="chev" />
        </button>

        {open && (
          <ul
            ref={listRef}
            className={`select-list${leaving ? ' leaving' : ''}`}
            role="listbox"
            tabIndex={-1}
            aria-labelledby={`${id}-label`}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={onListKey}
          >
            {options.map((o, i) => (
              <li
                key={o.id}
                id={`${id}-${i}`}
                role="option"
                aria-selected={o.id === value}
                data-active={i === active}
                className="select-opt"
                style={{ '--i': i }}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(i)}
              >
                <Check className="check" />
                <span>{o.label}</span>
                {o.meta && <span className="opt-meta">{o.meta}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

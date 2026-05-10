import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { CITY_KEYS, type CityKey } from "../lib/cities";

type Props = {
  value: CityKey | "";
  onChange: (v: CityKey | "") => void;
  label: string;
  exclude?: CityKey | "";
  id: string;
};

export function CitySelect({
  value,
  onChange,
  label,
  exclude,
  id,
}: Props) {
  const { t } = useTranslation();
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const options = useMemo(
    () => CITY_KEYS.filter((c) => c !== exclude),
    [exclude]
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((c) => {
      const name = t(`cities.${c}`).toLowerCase();
      const key = c.toLowerCase();
      return name.includes(needle) || key.includes(needle);
    });
  }, [options, q, t]);

  const displayLabel =
    value === "" ? "" : t(`cities.${value}`);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  function pick(c: CityKey | "") {
    onChange(c);
    setOpen(false);
    setQ("");
  }

  return (
    <div className="field city-select" ref={wrapRef}>
      <span className="label" id={`${id}-label`}>
        {label}
      </span>
      <div className="city-select__control">
        <input
          id={id}
          type="search"
          className="input touch-min city-select__input"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-labelledby={`${id}-label`}
          autoComplete="off"
          placeholder={value === "" ? "—" : displayLabel}
          value={open ? q : displayLabel}
          onChange={(e) => {
            setQ(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            setQ("");
          }}
        />
        {value !== "" && (
          <button
            type="button"
            className="city-select__clear touch-min"
            aria-label="Clear"
            onClick={() => pick("")}
          >
            ×
          </button>
        )}
      </div>
      {open && (
        <ul
          id={listId}
          className="city-select__list"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="city-select__empty muted">{t("filters.noMatch")}</li>
          ) : (
            filtered.map((c) => (
              <li key={c} role="option">
                <button
                  type="button"
                  className="city-select__option touch-min"
                  onClick={() => pick(c)}
                >
                  {t(`cities.${c}`)}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

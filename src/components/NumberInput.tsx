import { useEffect, useRef, useState } from "react";

interface NumberInputProps {
  value: number;
  onChange: (n: number) => void;
  id?: string;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  inputMode?: "numeric" | "decimal";
  autoFocus?: boolean;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
}

export default function NumberInput({
  value,
  onChange,
  inputMode = "numeric",
  ...rest
}: NumberInputProps) {
  const [text, setText] = useState<string>(() =>
    Number.isFinite(value) ? String(value) : "",
  );
  const lastEmittedRef = useRef<number>(value);

  useEffect(() => {
    if (value !== lastEmittedRef.current) {
      setText(Number.isFinite(value) ? String(value) : "");
      lastEmittedRef.current = value;
    }
  }, [value]);

  return (
    <input
      {...rest}
      type="number"
      inputMode={inputMode}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const n = raw === "" ? 0 : Number(raw);
        const safe = Number.isFinite(n) ? n : 0;
        lastEmittedRef.current = safe;
        onChange(safe);
      }}
      onBlur={(e) => {
        if (e.target.value === "") {
          setText("0");
          if (lastEmittedRef.current !== 0) {
            lastEmittedRef.current = 0;
            onChange(0);
          }
        }
      }}
    />
  );
}

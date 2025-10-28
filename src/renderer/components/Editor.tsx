import React, { useCallback, useMemo } from "react";
import MonacoEditor, { OnChange } from "@monaco-editor/react";

export type EditorProps = {
  value?: string;
  language?: string;
  theme?: string;
  readOnly?: boolean;
  onChange?: (value: string) => void;
};

const DEFAULT_LANGUAGE = "typescript";
const DEFAULT_THEME = "vs-dark";
const DEFAULT_VALUE = "// Start coding...";

export default function Editor({
  value = DEFAULT_VALUE,
  language = DEFAULT_LANGUAGE,
  theme = DEFAULT_THEME,
  readOnly = false,
  onChange,
}: EditorProps) {
  const normalizedTheme = useMemo(() => theme || DEFAULT_THEME, [theme]);

  const handleChange = useCallback<OnChange>(
    (nextValue) => {
      onChange?.(nextValue ?? "");
    },
    [onChange]
  );

  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        minHeight: 0,
        minWidth: 0,
      }}
    >
      <MonacoEditor
        theme={normalizedTheme}
        language={language}
        value={value}
        onChange={handleChange}
        loading={<div>Loading editor…</div>}
        options={{
          automaticLayout: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          readOnly,
          fontSize: 14,
        }}
        height="100%"
        width="100%"
      />
    </div>
  );
}

declare module "@monaco-editor/react" {
  import type { ComponentType, ReactNode } from "react";

  export type OnChange = (value: string | undefined, event?: unknown) => void;

  export interface MonacoEditorProps {
    value?: string | null;
    language?: string;
    theme?: string;
    options?: Record<string, unknown>;
    onChange?: OnChange;
    loading?: ReactNode;
    height?: string | number;
    width?: string | number;
    defaultLanguage?: string;
    defaultValue?: string;
  }

  const MonacoEditor: ComponentType<MonacoEditorProps>;

  export default MonacoEditor;
}

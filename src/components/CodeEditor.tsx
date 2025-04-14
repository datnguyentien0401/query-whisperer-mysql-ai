
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  height?: string;
  className?: string;
}

const CodeEditor = ({
  value,
  onChange,
  language = "sql",
  placeholder = "Enter code here...",
  height = "200px",
  className,
}: CodeEditorProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.max(
        parseInt(height),
        textarea.scrollHeight
      )}px`;
    }
  }, [value, height]);

  return (
    <div
      className={cn(
        "relative font-mono text-sm rounded-md border bg-black/5 overflow-hidden",
        className
      )}
      style={{ minHeight: height }}
    >
      <pre
        className="whitespace-pre-wrap break-words p-3 overflow-hidden"
        style={{ minHeight: height }}
      >
        {value || placeholder}
      </pre>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="absolute inset-0 resize-none bg-transparent p-3 text-transparent caret-black outline-none w-full"
        style={{ minHeight: height }}
      />
    </div>
  );
};

export default CodeEditor;

import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { applyTheme, readTheme, saveTheme, type ThemePref } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ onHeader = false }: { onHeader?: boolean }) {
  const [pref, setPref] = useState<ThemePref>(() => readTheme());
  const choose = (value: ThemePref) => {
    setPref(value);
    saveTheme(value);
    applyTheme(value);
  };
  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-md border p-0.5", onHeader ? "border-white/25" : "border-border")}>
      {OPTIONS.map(({ value, label, Icon }) => {
        const active = pref === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            onClick={() => choose(value)}
            className={cn(
              "inline-flex items-center justify-center rounded-[5px] p-1.5 focus-visible:outline-2 focus-visible:outline-offset-1",
              active
                ? onHeader
                  ? "bg-white/20 text-header-foreground"
                  : "bg-primary text-primary-foreground"
                : onHeader
                  ? "text-header-foreground/70 hover:text-header-foreground"
                  : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

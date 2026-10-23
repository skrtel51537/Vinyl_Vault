import React, { useState } from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { applyTheme, getThemePreference, nextThemePreference, setThemePreference, ThemePreference } from '../services/theme';

const OPTIONS: Record<ThemePreference, { label: string; Icon: typeof Sun }> = {
  system: { label: 'System theme', Icon: Monitor },
  light: { label: 'Light theme', Icon: Sun },
  dark: { label: 'Listening room (dark)', Icon: Moon },
};

/** Cycles the theme: system → light → dark. Shows the current choice. */
const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [preference, setPreference] = useState<ThemePreference>(getThemePreference);
  const next = nextThemePreference(preference);
  const { label, Icon } = OPTIONS[preference];

  const cycle = () => {
    setThemePreference(next);
    applyTheme(next);
    setPreference(next);
  };

  return (
    <button
      onClick={cycle}
      className={className}
      title={`${label}. Click for ${OPTIONS[next].label.toLowerCase()}`}
      aria-label={`${label}. Change theme`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};

export default ThemeToggle;

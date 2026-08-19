import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle — renders a labelled pill switch for dark ↔ light mode.
 * Reads/writes from ThemeContext so the preference is global & persisted.
 */
const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="theme-toggle-wrap">
      <span style={{ fontSize: 16 }}>🌙</span>
      <label className="theme-toggle-switch" aria-label="Toggle light/dark mode">
        <input
          type="checkbox"
          checked={isLight}
          onChange={toggleTheme}
          id="theme-toggle-input"
        />
        <span className="theme-toggle-track">
          <span className="theme-toggle-thumb">
            {isLight ? '☀️' : '🌙'}
          </span>
        </span>
      </label>
      <span style={{ fontSize: 16 }}>☀️</span>
    </div>
  );
};

export default ThemeToggle;

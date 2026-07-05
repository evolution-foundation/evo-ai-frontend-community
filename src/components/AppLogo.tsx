import type { CSSProperties } from 'react';
import { useDarkMode } from '../hooks/useDarkMode';

// TODO: replace this text placeholder with the real "EAP CRM" logo SVGs
// (dark/light variants) once brand assets are available.
const APP_NAME = 'EAP CRM';

interface AppLogoProps {
  className?: string;
  alt?: string;
  style?: CSSProperties;
  forceTheme?: 'dark' | 'light';
}

export function AppLogo({ className, alt = APP_NAME, style, forceTheme }: AppLogoProps) {
  const { theme } = useDarkMode();
  const effectiveTheme = forceTheme ?? theme;
  const textColor = effectiveTheme === 'dark' ? '#fafafa' : '#0a0a0a';

  return (
    <span
      role="img"
      aria-label={alt}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontWeight: 700,
        letterSpacing: '0.02em',
        color: textColor,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {APP_NAME}
    </span>
  );
}

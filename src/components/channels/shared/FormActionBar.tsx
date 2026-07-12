import { ReactNode } from 'react';

interface FormActionBarProps {
  children: ReactNode;
  /**
   * Breaks out of the FormContainer content padding (`p-6`) so the band sits
   * flush at the card/modal bottom edge, matching the generic FormFooter.
   */
  flush?: boolean;
  className?: string;
}

/**
 * Canonical footer band shared by every channel config screen. The generic
 * submit path uses {@link FormFooter}; the owned redirect flows (Facebook,
 * Instagram, Email, Evo Hub) render their own action inside this same band so
 * the visual footer is consistent regardless of who owns the submit.
 */
export const FormActionBar = ({ children, flush = true, className = '' }: FormActionBarProps) => (
  <div
    className={`border-t border-border bg-muted/20 px-6 py-4 ${
      flush ? '-mx-6 -mb-6 mt-6' : ''
    } ${className}`}
  >
    {children}
  </div>
);

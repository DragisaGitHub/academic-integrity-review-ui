"use client";

import * as React from "react";
import { Toaster as Sonner, ToasterProps } from "sonner";

type SonnerTheme = NonNullable<ToasterProps['theme']>;

function getCurrentTheme(): SonnerTheme {
  if (typeof document === 'undefined') return 'system';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

const Toaster = ({ ...props }: ToasterProps) => {
  const [theme, setTheme] = React.useState<SonnerTheme>(getCurrentTheme());

  React.useEffect(() => {
    setTheme(getCurrentTheme());

    const root = document.documentElement;
    const observer = new MutationObserver(() => {
      setTheme(getCurrentTheme());
    });

    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

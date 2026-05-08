import '~/globals.css';

import type { ReactNode } from 'react';

/**
 * Standalone layout for the design preview. Lives outside [locale] so it
 * renders without needing i18n setup, BC product fetches, or any of the
 * Catalyst providers — it's a pure "design playground" page.
 */
export default function PreviewLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>PM Catalyst — design preview</title>
        <meta name="robots" content="noindex,nofollow" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="bg-pm-paper text-pm-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}

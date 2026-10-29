import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'IssueLift v1.3 — Pre-Contribution Contract & TraceMap Engine',
  description:
    'Before a newcomer edits code, IssueLift converts a real GitHub issue into an evidence-backed Contribution Contract, maps criteria to test evidence, and exports a verified Proof Bundle. Powered by Google Gemma 4 and deterministic Claim Gate.',
  keywords: [
    'Hacktoberfest 2026',
    'Open Innovation',
    'Gemma 4',
    'GitHub REST',
    'Contribution Contract',
    'TraceMap',
    'Claim Gate',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('issuelift-theme') || 'dark';
                const isDark = stored === 'dark' || (stored === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (_) {}
            `,
          }}
        />
      </head>
      <body className="bg-slate-50 dark:bg-midnight-950 text-slate-900 dark:text-slate-100 min-h-screen antialiased selection:bg-violet-500 selection:text-white transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}

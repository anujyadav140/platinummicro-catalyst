import { setRequestLocale } from 'next-intl/server';
import { PropsWithChildren } from 'react';

import { Footer } from '~/components/footer';
import { Header } from '~/components/header';

interface Props extends PropsWithChildren {
  params: Promise<{ locale: string }>;
}

export default async function DefaultLayout({ params, children }: Props) {
  const { locale } = await params;

  setRequestLocale(locale);

  return (
    <>
      <Header />

      {/* `overflow-x-hidden` defangs any rogue child that overflows the viewport
          on phones (long unbroken SKUs, fixed-width tables, etc.). Sections
          can still be intentionally horizontally scrollable via their own
          `overflow-x-auto` — that lives below this clip and is unaffected. */}
      <main className="w-full max-w-full overflow-x-hidden">{children}</main>

      <Footer />
    </>
  );
}

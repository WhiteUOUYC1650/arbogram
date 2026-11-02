import Link from 'next/link';

import { SlinkLogo } from '@/components/slink-logo';
import { APP_NAME } from '@/lib/brand';

export default function NotFound() {
  return (
    <div className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
      />

      <div className="relative z-10 flex max-w-sm flex-col items-center gap-5">
        <SlinkLogo className="h-20 w-20" />
        <div className="space-y-2">
          <p className="text-5xl font-extrabold tracking-tight text-on-surface">404</p>
          <h1 className="text-lg font-bold text-on-surface">Такой страницы нет</h1>
          <p className="text-sm text-on-surface-variant">
            Возможно, ссылка устарела. Вернитесь в {APP_NAME} и продолжите общение.
          </p>
        </div>
        <Link
          href="/"
          className="flex h-12 items-center justify-center rounded-full bg-primary px-6 text-sm font-bold text-primary-foreground shadow-m3 transition-transform active:scale-[0.98]"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}

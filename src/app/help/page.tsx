"use client";

import { PageTitle } from '@/components/ui/page-title';
import { cn } from '@/lib/utils';
import { Link } from 'next/link';
import { useTranslation } from 'react-i18next';

export default function HelpPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] p-4 md:p-8">
      <PageTitle title={t.help} />
      <div className="prose max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t.help_title}</h1>
        <div>
          {t.help_search_users}
          {t.help_how_to_use}
          {t.help_faq}
        </div>
        <p>{t.help_contact_support}</p>
      </div>
    </div>
  );
}

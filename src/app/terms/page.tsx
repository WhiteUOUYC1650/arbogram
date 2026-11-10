"use client";

import { PageTitle } from '@/components/ui/page-title';
import { useTranslation } from 'react-i18next';

export default function TermsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] p-4 md:p-8">
      <PageTitle title={t.terms} />
      <div className="prose max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t.terms_conditions}</h1>
        <p>{t.terms_intro}</p>
        <ol>
          <li>{t.terms_1}</li>
          <li>{t.terms_2}</li>
          <li>{t.terms_3}</li>
        </ol>
        <p>{t.terms_contact}</p>
      </div>
    </div>
  );
}

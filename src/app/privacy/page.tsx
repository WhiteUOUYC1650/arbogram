"use client";

import { PageTitle } from '@/components/ui/page-title';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

export default function PrivacyPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-[100dvh] p-4 md:p-8">
      <PageTitle title={t.privacy} />
      <div className="prose max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">{t.privacy_policy}</h1>
        <p>{t.privacy_intro}</p>
        <ul>
          <li>{t.privacy_data_collection}</li>
          <li>{t.privacy_data_usage}</li>
          <li>{t.privacy_data_sharing}</li>
        </ul>
        <p>{t.privacy_controls}</p>
        <p>{t.privacy_contact}</p>
      </div>
    </div>
  );
}

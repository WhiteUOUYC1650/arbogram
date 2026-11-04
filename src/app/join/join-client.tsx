"use client";

import { useSearchParams } from 'next/navigation';

import { ChannelJoin } from '@/components/channels/channel-join';

export function ChannelJoinPage() {
  const params = useSearchParams();
  const slug = (params.get('slug') || '').trim();

  if (!slug) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-background px-6 text-center">
        <p className="text-sm text-on-surface-variant">В ссылке нет слага канала.</p>
      </div>
    );
  }

  return <ChannelJoin slug={slug} />;
}

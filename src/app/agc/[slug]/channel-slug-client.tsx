"use client";

import { ChannelJoin } from '@/components/channels/channel-join';

/** Открытие канала по пути /agc/<slug> (совместимость со старыми ссылками). */
export default function ChannelSlugClient({ slug }: { slug: string }) {
  return <ChannelJoin slug={slug} />;
}

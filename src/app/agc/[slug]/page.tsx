import ChannelSlugClient from "./channel-slug-client";

/**
 * Серверный компонент для резолвинга ссылок каналов.
 */
export async function generateStaticParams() {
  // Заглушка для статического экспорта
  return [{ slug: 'welcome' }];
}

export const dynamicParams = false;

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ChannelSlugClient slug={resolvedParams.slug} />;
}

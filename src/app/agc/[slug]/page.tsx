import ChannelSlugClient from "./channel-slug-client";

/**
 * Серверный компонент для генерации статических путей.
 * Не содержит "use client", чтобы не конфликтовать с generateStaticParams.
 */
export async function generateStaticParams() {
  // Возвращаем хотя бы один путь-заглушку, чтобы Next.js разрешил статический экспорт
  return [{ slug: 'welcome' }];
}

/**
 * dynamicParams = false запрещает генерацию путей в рантайме (что невозможно в APK).
 */
export const dynamicParams = false;

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ChannelSlugClient slug={resolvedParams.slug} />;
}

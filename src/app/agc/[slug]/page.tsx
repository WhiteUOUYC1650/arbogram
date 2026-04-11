import ChannelSlugClient from "./channel-slug-client";

/**
 * Обязательно для output: export в Next.js 15 для динамических роутов.
 */
export function generateStaticParams() {
  return [];
}

/**
 * Запрещаем генерацию на лету, так как в APK нет сервера.
 */
export const dynamicParams = false;

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ChannelSlugClient slug={resolvedParams.slug} />;
}

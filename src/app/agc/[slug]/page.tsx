import ChannelSlugClient from "./channel-slug-client";

/**
 * Обязательно для output: export в Next.js.
 * Генерирует статический путь для сборки.
 */
export async function generateStaticParams() {
  return [{ slug: 'main' }];
}

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelSlugClient slug={slug} />;
}
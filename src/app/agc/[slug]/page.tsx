import ChannelSlugClient from "./channel-slug-client";

/**
 * Обязательно для output: export в Next.js.
 * Генерирует статический путь для сборки.
 */
export async function generateStaticParams() {
  return [{ slug: 'main' }];
}

export default function ChannelSlugPage({ params }: { params: { slug: string } }) {
  return <ChannelSlugClient slug={params.slug} />;
}
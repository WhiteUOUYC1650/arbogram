
import ChannelSlugClient from "./channel-slug-client";

/**
 * Для статического экспорта (output: export) необходимо предоставить хотя бы один параметр.
 * В APK все динамические переходы будут обрабатываться через этот "скелет".
 */
export function generateStaticParams() {
  return [{ slug: 'resolve' }];
}

/**
 * Страница-обертка для обработки ссылок на каналы.
 * В APK она служит точкой входа для agc/slug.
 */
export default function ChannelSlugPage({ params }: { params: { slug: string } }) {
  return <ChannelSlugClient slug={params.slug} />;
}

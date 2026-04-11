import ChannelSlugClient from "./channel-slug-client";

export function generateStaticParams() {
  return [];
}

export const dynamicParams = false;

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <ChannelSlugClient slug={slug} />;
}

import ChannelSlugClient from "./channel-slug-client";

export async function generateStaticParams() {
  return [{ slug: 'welcome' }];
}

export const dynamicParams = false;

export default async function ChannelSlugPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params;
  return <ChannelSlugClient slug={resolvedParams.slug} />;
}
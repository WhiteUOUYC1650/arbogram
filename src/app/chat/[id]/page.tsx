import ChatClient from "./chat-client";

export async function generateStaticParams() {
  return [{ id: 'main' }];
}

export const dynamicParams = false;

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  return <ChatClient id={resolvedParams.id} />;
}
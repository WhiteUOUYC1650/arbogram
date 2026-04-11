import ChatClient from "./chat-client";

export function generateStaticParams() {
  return [];
}

export default async function IndividualChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ChatClient id={id} />;
}

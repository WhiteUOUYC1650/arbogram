import { Suspense } from 'react';

import { ChannelJoinPage } from './join-client';

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <ChannelJoinPage />
    </Suspense>
  );
}

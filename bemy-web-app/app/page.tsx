import ConnectTheDotsGame from './ConnectTheDotsGame';
import { Suspense } from 'react';

export default function Home() {
  return (
    <Suspense fallback={<div />}> 
      <ConnectTheDotsGame />
    </Suspense>
  );
}

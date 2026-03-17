'use client';

import { AuthProvider, InstanceProvider } from '@/components/providers';
import InstanceDetailPage from '@/components/InstanceDetail/InstanceDetailPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return (
    <AuthProvider>
      <InstanceProvider>
        <InstanceDetailPage instanceIdPromise={params} />
      </InstanceProvider>
    </AuthProvider>
  );
}

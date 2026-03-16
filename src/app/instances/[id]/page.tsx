import InstanceDetailPage from '@/components/InstanceDetail/InstanceDetailPage';

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <InstanceDetailPage instanceIdPromise={params} />;
}

import { ConfigPage } from '@/components/ConfigEditor/ConfigPage'

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  return <ConfigPage instanceIdPromise={params} />
}

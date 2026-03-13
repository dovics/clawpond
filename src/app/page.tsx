import { DashboardContent } from '@/components/DashboardContent';
import { ToasterProvider } from '@/components/ui/toaster';

export default function Dashboard() {
  return (
    <ToasterProvider>
      <DashboardContent />
    </ToasterProvider>
  );
}

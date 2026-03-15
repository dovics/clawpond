import { DashboardLayout } from '@/components/Dashboard';
import { AuthProvider, InstanceProvider } from '@/components/providers';

export default function Dashboard() {
  return (
    <AuthProvider>
      <InstanceProvider>
        <DashboardLayout />
      </InstanceProvider>
    </AuthProvider>
  );
}

import { redirect } from 'next/navigation';
import { localPreviewEnabled } from '@/lib/local-preview';
import { AdminShell } from '@/components/admin/shell';
export default function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!localPreviewEnabled()) redirect('/admin/login');
  return <AdminShell>{children}</AdminShell>;
}

import { redirect } from 'next/navigation';
import { localPreviewEnabled } from '@/lib/local-preview';
import { AdminShell } from '@/components/admin/shell';
import { cmsConfigured } from '@/lib/server/cms';
import { canEdit, localCmsPreview } from '@/lib/server/editor-auth';
export default async function EditorialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const remote = cmsConfigured();
  if (remote ? !(await canEdit()) : !localPreviewEnabled())
    redirect('/admin/login');
  return (
    <AdminShell remote={remote} sandbox={localCmsPreview()}>
      {children}
    </AdminShell>
  );
}

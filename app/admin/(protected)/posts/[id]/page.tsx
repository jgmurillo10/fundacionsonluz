import { PostEditor } from '@/components/admin/post-editor';
export default async function EditPost({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PostEditor key={id} id={id} />;
}

import { redirect } from 'next/navigation';

// Admin portal entry (/admin). Until a dedicated admin dashboard exists
// (Phase 6), land on the users screen. Role gating happens in the layout.
export default function AdminIndexPage() {
  redirect('/admin/users');
}

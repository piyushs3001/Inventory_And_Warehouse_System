import { AppTitle } from '@/components/app-title';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <AppTitle />
      <Button>Get started</Button>
    </main>
  );
}

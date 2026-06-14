import { Toaster } from '@/ui/components/ui/sonner';

import { Footer } from './layout/Footer';
import { Header } from './layout/Header';
import { Sidebar } from './layout/Sidebar';

export function App() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <Header />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="flex flex-1 flex-col items-center justify-center border-x border-border bg-muted/30 p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight">Transform Studio</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Visual data transformation workspace — pipeline canvas coming soon.
            </p>
          </div>
        </main>
      </div>
      <Footer />
      <Toaster />
    </div>
  );
}

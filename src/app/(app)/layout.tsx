import type { ReactNode } from "react";
import { requireUser } from "@/lib/auth/session";
import { CurrentUserProvider } from "@/components/layout/CurrentUserProvider";
import { Sidebar } from "@/components/layout/Sidebar";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <CurrentUserProvider user={user}>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar user={{ name: user.name, email: user.email, role: user.role }} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1320px] px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pt-10">{children}</div>
        </main>
      </div>
    </CurrentUserProvider>
  );
}

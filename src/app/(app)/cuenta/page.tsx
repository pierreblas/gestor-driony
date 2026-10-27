import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { ROLE_DESCRIPTION, ROLE_LABEL, isUserRole } from "@/lib/constants";
import { logout } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountForm } from "@/components/settings/AccountForm";
import { ReplayTourButton } from "@/components/tour/ReplayTourButton";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const me = await requireUser();
  const role = isUserRole(me.role) ? me.role : "MIEMBRO";

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Mi cuenta"
        description={`${ROLE_LABEL[role]}${me.isMaster ? " (cuenta master)" : ""}. ${ROLE_DESCRIPTION[role]}`}
        action={
          <>
            <ReplayTourButton />
            <form action={logout}>
              <Button type="submit" variant="secondary">
                Cerrar sesión
              </Button>
            </form>
          </>
        }
      />
      <Card className="px-5 py-5">
        <AccountForm name={me.name} email={me.email} />
      </Card>
    </div>
  );
}

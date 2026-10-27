import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email";
import { getTeamOptions, getUsers } from "@/lib/queries";
import { pluralize } from "@/lib/utils";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserFormDialog } from "@/components/users/UserFormDialog";
import { UserTable } from "@/components/users/UserTable";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Personas" };

export default async function UsuariosPage() {
  const me = await requireAdmin();
  const [users, teams, emailReady] = await Promise.all([getUsers(), getTeamOptions(), isEmailConfigured()]);
  const active = users.filter((u) => u.active).length;
  const inactive = users.length - active;

  return (
    <>
      <PageHeader
        title="Personas"
        description={
          users.length === 0
            ? "Las personas del espacio de trabajo, sus roles y los equipos a los que pertenecen."
            : `${active} ${pluralize(active, "persona activa", "personas activas")}${
                inactive > 0 ? ` y ${inactive} ${pluralize(inactive, "inactiva", "inactivas")}` : ""
              } en ${teams.length} ${pluralize(teams.length, "equipo", "equipos")}.`
        }
        action={<UserFormDialog teams={teams} emailReady={emailReady} />}
      />
      <UserTable users={users} teams={teams} meId={me.id} emailReady={emailReady} />
    </>
  );
}

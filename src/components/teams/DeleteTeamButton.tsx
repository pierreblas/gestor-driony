"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteTeam } from "@/lib/actions/teams";
import { confirmAction, toastResult } from "@/lib/feedback";
import { Button } from "@/components/ui/Button";

export function DeleteTeamButton({
  teamId,
  teamName,
  taskCount,
}: {
  teamId: string;
  teamName: string;
  taskCount: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  async function handleDelete() {
    const ok = await confirmAction({
      title: `¿Eliminar el equipo ${teamName}?`,
      message:
        taskCount > 0
          ? `También se borrarán sus ${taskCount} tareas. Las personas no se borran. No se puede deshacer.`
          : "Las personas no se borran. No se puede deshacer.",
      confirmLabel: "Eliminar equipo",
      tone: "danger",
    });
    if (!ok) return;
    startTransition(async () => {
      if (toastResult(await deleteTeam(teamId))) router.push("/equipos");
    });
  }

  return (
    <Button variant="danger" onClick={handleDelete} loading={isPending}>
      <Trash2 className="h-4 w-4" aria-hidden />
      Eliminar
    </Button>
  );
}

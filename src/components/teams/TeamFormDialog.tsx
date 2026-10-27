"use client";

import { useCallback, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import type { UserOption } from "@/lib/queries";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TeamForm, type TeamFormTeam } from "./TeamForm";

export function TeamFormDialog({
  users,
  team,
  label,
  variant = "primary",
  size = "md",
}: {
  users: UserOption[];
  team?: TeamFormTeam;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const editing = Boolean(team);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        {editing ? <Pencil className="h-4 w-4" aria-hidden /> : <Plus className="h-4 w-4" aria-hidden />}
        {label ?? (editing ? "Editar equipo" : "Nuevo equipo")}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={editing ? "Editar equipo" : "Nuevo equipo"}
        description={editing ? undefined : "Dale un nombre, elige quién lo lidera y quiénes forman parte."}
      >
        <TeamForm team={team} users={users} onSuccess={close} />
      </Modal>
    </>
  );
}

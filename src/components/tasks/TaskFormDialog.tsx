"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import type { TeamOption, UserOption } from "@/lib/queries";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { TaskForm } from "./TaskForm";

export function TaskFormDialog({
  teams,
  users,
  defaultTeamId,
  label = "Nueva tarea",
  variant = "primary",
  size = "md",
}: {
  teams: TeamOption[];
  users: UserOption[];
  defaultTeamId?: string;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const disabled = teams.length === 0;

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        disabled={disabled}
        title={disabled ? "Crea un equipo antes de añadir tareas" : undefined}
      >
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title="Nueva tarea"
        description="Describe el trabajo, elige el equipo y, si quieres, asigna una persona y una fecha."
      >
        <TaskForm teams={teams} users={users} defaultTeamId={defaultTeamId} onSuccess={close} />
      </Modal>
    </>
  );
}

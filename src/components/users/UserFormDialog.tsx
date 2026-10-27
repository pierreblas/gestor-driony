"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import type { TeamOption } from "@/lib/queries";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ShareLink } from "./ShareLink";
import { UserForm } from "./UserForm";

export function UserFormDialog({
  teams,
  emailReady,
  label = "Añadir persona",
  variant = "primary",
  size = "md",
}: {
  teams: TeamOption[];
  emailReady: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
}) {
  const [open, setOpen] = useState(false);
  const [share, setShare] = useState<{ message: string; link: string } | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    setShare(null);
  }, []);
  const handleSuccess = useCallback(
    (result?: { message?: string; link?: string }) => {
      if (result?.link) setShare({ message: result.message ?? "", link: result.link });
      else close();
    },
    [close],
  );

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" aria-hidden />
        {label}
      </Button>
      <Modal
        open={open}
        onClose={close}
        title={share ? "Comparte su enlace de acceso" : "Añadir persona"}
        description={
          share
            ? undefined
            : emailReady
              ? "Le llegará un correo para activar su cuenta y elegir su contraseña."
              : "Al guardar verás un enlace para que active su cuenta."
        }
      >
        {share ? (
          <ShareLink message={share.message} link={share.link} onDone={close} />
        ) : (
          <UserForm teams={teams} onSuccess={handleSuccess} />
        )}
      </Modal>
    </>
  );
}

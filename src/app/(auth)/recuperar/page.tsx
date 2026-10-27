import type { Metadata } from "next";
import { RequestLinkForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Recibir enlace de acceso" };

export default function RecuperarPage() {
  return (
    <>
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">Te enviamos un enlace</h1>
      <p className="mb-6 mt-1 text-[15px] leading-relaxed text-ink-2">
        Escribe tu correo. Si es la primera vez, el enlace activa tu cuenta. Si olvidaste la contraseña, te deja elegir
        una nueva.
      </p>
      <RequestLinkForm />
    </>
  );
}

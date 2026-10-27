import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { masterNeedsSetup } from "@/lib/actions/auth";
import { masterEmail } from "@/lib/auth/roles";
import { MasterSetupForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Configurar la cuenta master" };

export default async function PrimerAccesoPage() {
  const email = masterEmail();
  if (!email) {
    return (
      <>
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">Falta el correo master</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Añade MASTER_EMAIL al archivo .env del proyecto y reinicia la aplicación.
        </p>
      </>
    );
  }
  if (!(await masterNeedsSetup())) redirect("/login");

  return (
    <>
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">Configura la cuenta master</h1>
      <p className="mb-6 mt-1 text-[15px] leading-relaxed text-ink-2">
        Es la cuenta de administración principal. Solo se configura una vez; después podrás añadir al resto de personas.
      </p>
      <MasterSetupForm email={email} />
    </>
  );
}

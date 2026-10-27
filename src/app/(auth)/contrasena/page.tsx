import Link from "next/link";
import type { Metadata } from "next";
import { firstName } from "@/lib/current-user";
import { findValidToken } from "@/lib/auth/tokens";
import { SetPasswordForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Elegir contraseña" };

export default async function ContrasenaPage({ searchParams }: PageProps<"/contrasena">) {
  const sp = await searchParams;
  const token = typeof sp.token === "string" ? sp.token : "";
  const row = await findValidToken(token);

  if (!row) {
    return (
      <>
        <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">Este enlace ya no sirve</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-ink-2">
          Puede que haya caducado o que ya lo hayas usado. Pide uno nuevo y usa siempre el último correo que te llegue.
        </p>
        <Link
          href="/recuperar"
          className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-control bg-accent text-[15px] font-medium text-accent-ink hover:bg-accent-strong"
        >
          Pedir un enlace nuevo
        </Link>
      </>
    );
  }

  const firstTime = !row.user.passwordHash;
  return (
    <>
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">
        {firstTime ? `Hola, ${firstName(row.user.name)}` : "Elige una contraseña nueva"}
      </h1>
      <p className="mb-6 mt-1 text-[15px] leading-relaxed text-ink-2">
        {firstTime
          ? `Elige la contraseña con la que entrarás como ${row.user.email}.`
          : `Para la cuenta ${row.user.email}. Al guardarla se cerrará la sesión en tus otros dispositivos.`}
      </p>
      <SetPasswordForm token={token} firstTime={firstTime} />
    </>
  );
}

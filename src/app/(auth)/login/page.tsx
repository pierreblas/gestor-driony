import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { masterNeedsSetup } from "@/lib/actions/auth";
import { getSessionUser } from "@/lib/auth/session";
import { LoginForm } from "@/components/auth/AuthForms";

export const metadata: Metadata = { title: "Entrar" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getSessionUser()) redirect("/mis-tareas");
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const setup = await masterNeedsSetup();

  return (
    <>
      <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink">Entra a tu cuenta</h1>
      <p className="mb-6 mt-1 text-[15px] text-ink-2">Usa el correo con el que te dieron de alta.</p>
      {setup ? (
        <div className="mb-5 rounded-[10px] border border-accent/30 bg-accent-soft px-4 py-3 text-[14px] text-ink">
          La cuenta master todavía no tiene contraseña.{" "}
          <Link href="/primer-acceso" className="font-semibold text-accent-strong hover:underline">
            Configúrala aquí
          </Link>
          .
        </div>
      ) : null}
      <LoginForm next={next} />
    </>
  );
}

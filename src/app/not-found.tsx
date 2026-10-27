import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="card mx-auto mt-10 max-w-md px-8 py-12 text-center">
      <h1 className="font-display text-[28px] font-semibold tracking-tight text-ink">No encontramos esta página</h1>
      <p className="mt-2 text-[15px] text-ink-2">
        Puede que el enlace haya cambiado o que el elemento se haya eliminado.
      </p>
      <Link href="/" className="mt-6 inline-block">
        <Button variant="secondary">Volver al resumen</Button>
      </Link>
    </div>
  );
}

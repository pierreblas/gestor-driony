"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/Button";

/** Shows an access link to copy and send by hand (WhatsApp, chat…) when email isn't available. */
export function ShareLink({ message, link, onDone }: { message: string; link: string; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[15px] leading-relaxed text-ink-2">{message}</p>
      <div className="flex gap-2">
        <input
          className="control font-mono text-[12.5px]"
          value={link}
          readOnly
          aria-label="Enlace de acceso"
          onFocus={(e) => e.currentTarget.select()}
        />
        <Button variant="secondary" onClick={copy}>
          {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
          {copied ? "Copiado" : "Copiar"}
        </Button>
      </div>
      <p className="text-[13px] text-muted">
        El enlace es personal y sirve una sola vez. Configura el correo en Ajustes para que se envíe solo.
      </p>
      <div className="flex justify-end">
        <Button onClick={onDone}>Listo</Button>
      </div>
    </div>
  );
}

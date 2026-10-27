"use client";

import { CircleHelp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { startTour } from "./ProductTour";

export function ReplayTourButton() {
  return (
    <Button variant="secondary" onClick={startTour}>
      <CircleHelp className="h-4 w-4" aria-hidden />
      Ver el recorrido de nuevo
    </Button>
  );
}

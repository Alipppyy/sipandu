"use client";

import * as React from "react";
import { Printer, X } from "lucide-react";
import { Button } from "@/components/ui/primitives";

export function PrintButtons() {
  const [printing, setPrinting] = React.useState(false);

  return (
    <div className="mx-auto mb-5 flex w-full max-w-[720px] items-center justify-between gap-3 px-4 print:hidden">
      <Button
        onClick={() => {
          setPrinting(true);
          setTimeout(() => {
            window.print();
            setPrinting(false);
          }, 80);
        }}
        loading={printing}
      >
        <Printer className="h-4 w-4" />
        Cetak / Simpan PDF
      </Button>
      <Button
        variant="ghost"
        onClick={() => {
          if (window.history.length > 1) window.history.back();
          else window.close();
        }}
      >
        <X className="h-4 w-4" />
        Tutup
      </Button>
    </div>
  );
}

"use client";

import * as React from "react";
import { SWRConfig } from "swr";
import { Toaster } from "sonner";
import { get } from "@/lib/client/api";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        fetcher: get,
        revalidateOnFocus: false,
        shouldRetryOnError: false,
        dedupingInterval: 1500,
      }}
    >
      {children}
      <Toaster
        position="top-right"
        offset={16}
        toastOptions={{
          classNames: {
            toast:
              "!rounded-xl !border !border-line !bg-surface !text-foreground !shadow-lg !font-sans !text-[13px]",
            description: "!text-muted",
            actionButton: "!bg-primary !text-primary-foreground",
            cancelButton: "!bg-surface-muted !text-foreground",
          },
        }}
      />
    </SWRConfig>
  );
}

export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('sp-theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(!t&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

export function useTheme() {
  const [theme, setTheme] = React.useState<"light" | "dark">("light");

  React.useEffect(() => {
    const stored = (localStorage.getItem("sp-theme") as "light" | "dark" | null) ?? null;
    const initial = stored ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    setTheme(initial);
  }, []);

  const toggle = React.useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("sp-theme", next);
      return next;
    });
  }, []);

  return { theme, toggle };
}

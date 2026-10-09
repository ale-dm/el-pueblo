import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type Tone = "sun" | "danger" | "mafia" | "town";

export function Button({ tone = "sun", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  const toneClass = tone === "sun" ? "" : tone;
  return <button {...props} className={`cartoon-btn ${toneClass} ${className}`} />;
}

/** Tarjeta. Si la clase trae su propio padding (p-0, p-3…), sustituye al de por defecto. */
export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  const padding = /(^|\s)p[xytrbl]?-/.test(className) ? "" : "p-4";
  return <section className={`cartoon-card ${padding} ${className}`}>{children}</section>;
}

export function Pill({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <span className={`inline-block rounded-full border-2 border-ink bg-sun px-3 py-0.5 font-display text-sm text-ink ${className}`}>
      {children}
    </span>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`cartoon-input ${props.className ?? ""}`} />;
}

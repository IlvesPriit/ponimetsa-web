"use client";

import { useFormStatus } from "react-dom";
import type { ButtonHTMLAttributes, MouseEvent } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pendingLabel?: string;
  confirmMessage?: string;
};

export function SubmitButton({
  children,
  pendingLabel = "Palun oota…",
  confirmMessage,
  className = "",
  onClick,
  ...props
}: Props) {
  const { pending } = useFormStatus();

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    onClick?.(event);
    if (!event.defaultPrevented && confirmMessage && !window.confirm(confirmMessage)) {
      event.preventDefault();
    }
  }

  return (
    <button
      {...props}
      type={props.type ?? "submit"}
      disabled={pending || props.disabled}
      aria-busy={pending}
      onClick={handleClick}
      className={`${className} inline-flex items-center justify-center gap-2 transition active:scale-[0.98] disabled:cursor-wait disabled:opacity-65`}
    >
      {pending && (
        <span
          className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden="true"
        />
      )}
      <span>{pending ? pendingLabel : children}</span>
    </button>
  );
}

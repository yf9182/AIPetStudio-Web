import { ButtonLink } from "@/components/ui/Button";
import { Panel } from "@/components/ui/Layout";

/** Shared gate shown on pages that need a signed-in account. */
export function SignInRequired({
  title,
  description,
  actionHref = "/login",
  actionLabel = "登录"
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <Panel className="mx-auto flex w-full max-w-[480px] flex-col items-start gap-4 p-8">
      <span className="flex size-10 items-center justify-center rounded-full bg-white/6 text-ink-200">
        <svg viewBox="0 0 24 24" aria-hidden className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
        </svg>
      </span>
      <h2 className="text-2xl font-semibold tracking-[-0.6px] text-ink-50">{title}</h2>
      <p className="text-nav leading-6 text-white/55">{description}</p>
      <ButtonLink href={actionHref} size="lg" className="mt-2">
        {actionLabel}
      </ButtonLink>
    </Panel>
  );
}

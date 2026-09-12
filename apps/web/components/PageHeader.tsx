import Link from "next/link";

export interface Crumb {
  label: string;
  href?: string;
}

/**
 * Consistent page header used inside the AppShell content column.
 * Breadcrumbs communicate depth; the h1 sets the page identity;
 * `actions` is the right-rail slot for contextual buttons.
 *
 * Rule of thumb: every authenticated page renders exactly one of
 * these, and its content <main> continues below.
 */
export function PageHeader({
  crumbs = [],
  title,
  description,
  actions,
}: {
  crumbs?: Crumb[];
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3 pb-4">
      {crumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((c, i) => {
              const isLast = i === crumbs.length - 1;
              return (
                <li key={i} className="flex items-center gap-1.5">
                  {c.href && !isLast ? (
                    <Link
                      href={c.href}
                      className="transition-colors hover:text-foreground"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span
                      className={isLast ? "text-foreground" : undefined}
                      aria-current={isLast ? "page" : undefined}
                    >
                      {c.label}
                    </span>
                  )}
                  {!isLast ? (
                    <span aria-hidden className="text-muted-foreground/60">
                      /
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      ) : null}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Section heading used inside a page. Real h2, not a tracked-eyebrow
 * label. Optional right-side accessory.
 */
export function SectionHeader({
  title,
  description,
  accessory,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  accessory?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-base font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {accessory ? <div className="text-xs">{accessory}</div> : null}
    </div>
  );
}

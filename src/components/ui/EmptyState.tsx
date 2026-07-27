interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center py-16 text-center ${className}`}>
      {icon && (
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-paper-3 text-ink-muted text-2xl">
          {icon}
        </span>
      )}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-xs text-sm text-ink-muted">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

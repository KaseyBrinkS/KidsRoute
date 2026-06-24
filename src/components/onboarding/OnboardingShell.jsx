export default function OnboardingShell({ step, title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-lg">
        <p className="mb-4 text-center text-sm font-semibold text-primary">
          Step {step} of 4
        </p>
        <div className="kr-card overflow-hidden p-0">
          <div className="border-b border-border px-8 py-6">
            <h2 className="font-heading text-2xl font-semibold text-primary">{title}</h2>
            {description && (
              <p className="mt-2 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
          <div className="px-8 py-6">{children}</div>
        </div>
      </div>
    </div>
  )
}

import KidsRouteLogo from './KidsRouteLogo'

export default function AccessShell({ title, description, children }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4 py-10">
      <div className="kr-card w-full max-w-md overflow-hidden p-0">
        <div className="login-hero-gradient px-8 pb-6 pt-10">
          <div className="flex flex-col items-center text-center">
            <KidsRouteLogo className="h-20 w-20" />
            <h1 className="font-heading mt-5 text-2xl font-semibold text-primary">{title}</h1>
            {description && (
              <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>
            )}
          </div>
        </div>
        <div className="px-8 pb-10 pt-2">{children}</div>
      </div>
    </div>
  )
}

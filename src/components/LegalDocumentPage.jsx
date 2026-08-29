import { Link } from 'react-router-dom'

/**
 * Renders a legal document from structured sections.
 * Each section: { heading: string, blocks: Array<string | { type: 'list', items: string[] }> }
 */
export default function LegalDocumentPage({ title, lastUpdated, sections, backTo = '/' }) {
  return (
    <div className="min-h-screen bg-bg px-4 py-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl">
        <Link to={backTo} className="link-accent text-sm font-medium">
          ← Back to home
        </Link>

        <header className="mt-6">
          <h1 className="font-heading text-3xl font-semibold text-primary-dark sm:text-4xl">
            {title}
          </h1>
          {lastUpdated ? (
            <p className="mt-2 text-sm text-muted">Last updated: {lastUpdated}</p>
          ) : null}
        </header>

        <article className="kr-card mt-8 space-y-8 p-6 sm:p-8">
          {sections.map((section) => (
            <section key={section.heading}>
              <h2 className="font-heading text-xl font-semibold text-primary">
                {section.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {section.blocks.map((block, index) => {
                  if (typeof block === 'string') {
                    return (
                      <p
                        key={index}
                        className="text-base leading-relaxed text-[var(--color-text)]"
                      >
                        {block}
                      </p>
                    )
                  }

                  if (block.type === 'list') {
                    return (
                      <ul
                        key={index}
                        className="list-disc space-y-2 pl-5 text-base leading-relaxed text-[var(--color-text)]"
                      >
                        {block.items.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )
                  }

                  return null
                })}
              </div>
            </section>
          ))}
        </article>

        <div className="mt-6 text-center">
          <Link to={backTo} className="link-accent text-sm font-medium">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}

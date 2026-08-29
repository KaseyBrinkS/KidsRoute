import FlyerLogo from '../components/FlyerLogo'
import FlyerQrPlaceholder from '../components/FlyerQrPlaceholder'
import {
  FLYER_CONTACT_EMAIL,
  FLYER_FEATURES,
  FLYER_HOW_IT_WORKS,
  FLYER_INTRO,
  FLYER_LOCATION,
  FLYER_SIGNUP_URL,
  FLYER_TAGLINE,
} from '../content/flyerContent'

export default function Flyer() {
  function handlePrint() {
    window.print()
  }

  return (
    <>
      <style>{`
        @page {
          size: letter portrait;
          margin: 0.45in;
        }

        @media print {
          html, body {
            width: 8.5in;
            height: 11in;
            margin: 0;
            padding: 0;
            background: #fff !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .flyer-no-print {
            display: none !important;
          }

          .flyer-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }

        @media screen {
          .flyer-screen-wrap {
            min-height: 100vh;
            background: #e8e4de;
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 1rem;
          }
        }
      `}</style>

      <div className="flyer-screen-wrap">
        <div className="flyer-no-print flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-2xl bg-[#3d6b5e] px-6 py-3 text-sm font-semibold text-white shadow-md"
          >
            Print flyer
          </button>
          <p className="text-sm text-[#1C3A4A]/70">
            Use <strong>Print → Save as PDF</strong> for a PDF copy (8.5×11 in).
          </p>
        </div>

        <article
          className="flyer-page mx-auto box-border w-[8.5in] min-h-[11in] bg-white px-[0.55in] py-[0.5in] text-[#1C3A4A] shadow-xl"
          aria-label="KidsRoute printable flyer"
        >
          {/* Header */}
          <header className="flex items-center gap-5 border-b-4 border-[#3d6b5e] pb-4">
            <FlyerLogo className="h-[1.15in] w-[1.15in] shrink-0" />
            <div className="min-w-0 flex-1">
              <h1 className="font-heading text-[42pt] font-bold leading-none tracking-tight text-[#1C3A4A]">
                KidsRoute
              </h1>
              <p className="mt-2 text-[13pt] font-semibold leading-snug text-[#3d6b5e]">
                Safe group walks for kids — to school &amp; after-school activities
              </p>
            </div>
          </header>

          {/* Intro */}
          <section className="mt-4">
            <p className="text-[11pt] leading-[1.45] text-[#1C3A4A]">{FLYER_INTRO}</p>
            <p className="mt-2 text-[11.5pt] font-bold leading-snug text-[#C4768A]">
              {FLYER_TAGLINE}
            </p>
          </section>

          {/* How it works */}
          <section className="mt-5">
            <h2 className="text-[14pt] font-bold uppercase tracking-wide text-[#3d6b5e]">
              How it works
            </h2>
            <ol className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
              {FLYER_HOW_IT_WORKS.map((step) => (
                <li key={step.step} className="flex gap-2">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#3d6b5e] text-[10pt] font-bold text-white"
                    aria-hidden="true"
                  >
                    {step.step}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <p className="text-[10.5pt] font-bold leading-tight">{step.title}</p>
                    <p className="text-[9pt] leading-snug text-[#1C3A4A]/80">
                      {step.description}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* Features */}
          <section className="mt-5 rounded-xl bg-[#F8F4EE] px-4 py-3">
            <h2 className="text-[14pt] font-bold uppercase tracking-wide text-[#3d6b5e]">
              Why families love KidsRoute
            </h2>
            <ul className="mt-2 columns-2 gap-6 text-[9.5pt] leading-[1.35]">
              {FLYER_FEATURES.map((feature) => (
                <li key={feature} className="mb-1.5 break-inside-avoid pl-4 [list-style-type:disc]">
                  {feature}
                </li>
              ))}
            </ul>
          </section>

          {/* CTA + QR */}
          <footer className="mt-5 flex items-end justify-between gap-6 border-t-2 border-[#e3ddd4] pt-4">
            <div className="min-w-0 flex-1">
              <p className="text-[16pt] font-bold text-[#1C3A4A]">Sign up free today</p>
              <p className="mt-1 text-[13pt] font-semibold text-[#3d6b5e]">
                {FLYER_SIGNUP_URL.replace('https://', '')}
              </p>
              <p className="mt-2 text-[10pt] text-[#1C3A4A]/85">
                Questions?{' '}
                <span className="font-semibold">{FLYER_CONTACT_EMAIL}</span>
              </p>
              <p className="mt-1 text-[9pt] font-medium uppercase tracking-wide text-[#1C3A4A]/60">
                {FLYER_LOCATION}
              </p>
              <p className="mt-3 text-[8.5pt] italic text-[#1C3A4A]/55">
                Parents &amp; guardians only. Google sign-in. Admin-approved access.
              </p>
            </div>

            <div className="shrink-0 text-center">
              <FlyerQrPlaceholder className="mx-auto h-[1.35in] w-[1.35in]" />
              <p className="mt-1 max-w-[1.5in] text-[8pt] font-semibold leading-tight text-[#1C3A4A]/70">
                Scan to visit
                <br />
                kidsroute.org
              </p>
            </div>
          </footer>
        </article>
      </div>
    </>
  )
}

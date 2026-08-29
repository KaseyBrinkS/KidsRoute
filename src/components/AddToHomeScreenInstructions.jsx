import { ADD_TO_HOME_SCREEN_INSTRUCTIONS } from '../content/addToHomeScreen'

function InstructionList({ title, steps }) {
  return (
    <div>
      <p className="font-heading text-sm font-semibold text-primary">{title}</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text)]">
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </div>
  )
}

export default function AddToHomeScreenInstructions({ className = '' }) {
  return (
    <div className={`space-y-4 ${className}`}>
      <InstructionList title="iPhone" steps={ADD_TO_HOME_SCREEN_INSTRUCTIONS.iphone} />
      <InstructionList title="Android" steps={ADD_TO_HOME_SCREEN_INSTRUCTIONS.android} />
      <p className="text-xs leading-relaxed text-muted">{ADD_TO_HOME_SCREEN_INSTRUCTIONS.note}</p>
    </div>
  )
}

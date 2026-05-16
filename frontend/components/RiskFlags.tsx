'use client'

interface RiskFlagsProps {
  flags: string[]
}

export default function RiskFlags({ flags }: RiskFlagsProps) {
  if (flags.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
      <h3 className="mb-4 text-lg font-semibold text-white">Risk Flags</h3>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400"
          >
            <span className="text-xs">⚠</span>
            {flag}
          </span>
        ))}
      </div>
    </div>
  )
}

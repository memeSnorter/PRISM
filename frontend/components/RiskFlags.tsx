'use client'

interface RiskFlagsProps {
  flags: string[]
}

export default function RiskFlags({ flags }: RiskFlagsProps) {
  if (flags.length === 0) {
    return null
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-medium text-gray-900">Risk Flags</h3>
      <div className="flex flex-wrap gap-2">
        {flags.map((flag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-3 py-1.5 text-sm font-medium text-red-700"
          >
            <span className="text-xs">⚠</span>
            {flag}
          </span>
        ))}
      </div>
    </div>
  )
}

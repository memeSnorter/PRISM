'use client'

interface DriftBannerProps {
  driftDetected: boolean
}

export default function DriftBanner({ driftDetected }: DriftBannerProps) {
  if (driftDetected) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="font-medium text-red-700">Intent Drift Detected</h3>
            <p className="text-sm text-red-600/80">
              The code changes may not match the PR description
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
          <span className="text-xl">✓</span>
        </div>
        <div>
          <h3 className="font-medium text-emerald-700">Intent Aligned</h3>
          <p className="text-sm text-emerald-600/80">
            The code changes match the PR description
          </p>
        </div>
      </div>
    </div>
  )
}

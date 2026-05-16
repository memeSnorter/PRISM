'use client'

interface DriftBannerProps {
  driftDetected: boolean
}

export default function DriftBanner({ driftDetected }: DriftBannerProps) {
  if (driftDetected) {
    return (
      <div className="rounded-xl border border-red-800 bg-red-950/50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/20">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <h3 className="font-semibold text-red-400">Intent Drift Detected</h3>
            <p className="text-sm text-red-300/70">
              The code changes may not match the PR description
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-green-800 bg-green-950/50 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
          <span className="text-xl">✓</span>
        </div>
        <div>
          <h3 className="font-semibold text-green-400">Intent Aligned</h3>
          <p className="text-sm text-green-300/70">
            The code changes match the PR description
          </p>
        </div>
      </div>
    </div>
  )
}

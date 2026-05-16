'use client'

interface LoadingStateProps {
  phase: number
}

const phases = [
  { text: 'Reading the diff...', icon: '📖' },
  { text: 'Detecting intent drift...', icon: '🔍' },
  { text: 'Generating confidence score...', icon: '📊' },
]

export default function LoadingState({ phase }: LoadingStateProps) {
  const currentPhase = phases[Math.min(phase, phases.length - 1)]

  return (
    <div className="mx-auto max-w-md text-center">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        {/* Animated Prism */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            {/* Pulsing rings */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-24 w-24 animate-ping rounded-full bg-gray-200" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-20 w-20 animate-ping rounded-full bg-gray-300"
                style={{ animationDelay: '0.5s' }}
              />
            </div>

            {/* Main icon */}
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gray-900">
              <svg
                className="h-10 w-10 text-white"
                viewBox="0 0 100 100"
                fill="currentColor"
              >
                <polygon points="50,15 85,75 15,75" />
              </svg>
            </div>
          </div>
        </div>

        {/* Phase indicator */}
        <div className="mb-4 text-3xl">{currentPhase.icon}</div>

        {/* Loading text */}
        <p className="mb-4 text-lg font-medium text-gray-900">
          {currentPhase.text}
        </p>

        {/* Animated dots */}
        <div className="flex justify-center gap-1">
          <span className="loading-dot h-2 w-2 rounded-full bg-gray-400" />
          <span className="loading-dot h-2 w-2 rounded-full bg-gray-400" />
          <span className="loading-dot h-2 w-2 rounded-full bg-gray-400" />
        </div>

        {/* Progress indicator */}
        <div className="mt-6">
          <div className="flex justify-center gap-2">
            {phases.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 w-8 rounded-full transition-colors ${
                  index <= phase ? 'bg-gray-900' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Helpful tip */}
      <p className="mt-4 text-sm text-gray-500">
        This may take a moment depending on the PR size...
      </p>
    </div>
  )
}

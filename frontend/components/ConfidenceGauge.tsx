'use client'

import { useEffect, useState } from 'react'

interface ConfidenceGaugeProps {
  score: number
}

export default function ConfidenceGauge({ score }: ConfidenceGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = score / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setAnimatedScore(score)
        clearInterval(timer)
      } else {
        setAnimatedScore(Math.round(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [score])

  const getColor = (value: number) => {
    if (value <= 40) return { bg: 'bg-red-500', stroke: '#dc2626', text: 'text-red-600' }
    if (value <= 70) return { bg: 'bg-amber-500', stroke: '#d97706', text: 'text-amber-600' }
    return { bg: 'bg-emerald-500', stroke: '#059669', text: 'text-emerald-600' }
  }

  const colors = getColor(score)

  // SVG circle calculations
  const radius = 45
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (animatedScore / 100) * circumference

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col items-center">
        {/* Circular Gauge */}
        <div className="relative mb-4">
          <svg className="h-40 w-40 -rotate-90 transform">
            {/* Background circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            {/* Progress circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={colors.stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-300"
            />
          </svg>

          {/* Score number in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className={`text-4xl font-semibold ${colors.text}`}>
                {animatedScore}
              </span>
              <span className="text-lg text-gray-400">/100</span>
            </div>
          </div>
        </div>

        {/* Label */}
        <p className="text-sm font-medium text-gray-500">
          Merge Confidence
        </p>

        {/* Visual bar indicator */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full ${colors.bg} transition-all duration-1000`}
            style={{ width: `${animatedScore}%` }}
          />
        </div>

        {/* Scale labels */}
        <div className="mt-2 flex w-full justify-between text-xs text-gray-400">
          <span>High Risk</span>
          <span>Safe to Merge</span>
        </div>
      </div>
    </div>
  )
}

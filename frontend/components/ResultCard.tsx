'use client'

interface ResultCardProps {
  icon: string
  title: string
  content: string
  variant?: 'default' | 'danger'
}

export default function ResultCard({
  icon,
  title,
  content,
  variant = 'default',
}: ResultCardProps) {
  const borderClass =
    variant === 'danger'
      ? 'border-red-200 bg-red-50'
      : 'border-gray-200 bg-white'

  const textClass =
    variant === 'danger'
      ? 'text-red-700'
      : 'text-gray-600'

  return (
    <div
      className={`card-hover rounded-lg border p-5 shadow-sm ${borderClass}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-medium text-gray-900">{title}</h3>
      </div>
      <p className={`leading-relaxed ${textClass}`}>{content}</p>
    </div>
  )
}

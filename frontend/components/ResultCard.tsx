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
      ? 'border-red-800 bg-red-950/30'
      : 'border-gray-800 bg-gray-900'

  return (
    <div
      className={`card-hover rounded-xl border p-5 ${borderClass}`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      <p className="leading-relaxed text-gray-300">{content}</p>
    </div>
  )
}

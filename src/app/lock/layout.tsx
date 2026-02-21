export default function LockLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="mb-7">
      <h1 className="text-3xl font-bold tracking-tight text-foreground text-balance sm:text-4xl">
        {title}
      </h1>
      <p className="mt-1 text-muted-foreground">{subtitle}</p>
    </header>
  )
}

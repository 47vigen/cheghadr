import { Link } from '@/i18n/navigation'

export default function NotFound() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="font-display font-semibold text-3xl">404</h1>
      <p className="text-muted-foreground text-sm">
        The page you are looking for does not exist.
      </p>
      <Link
        className="text-accent text-sm underline-offset-4 hover:underline"
        href="/"
      >
        Back to home
      </Link>
    </div>
  )
}

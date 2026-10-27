import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-5xl font-extrabold">Nothing to clean here</h1>
      <p className="mt-4 text-lg text-ink-soft">This page doesn't exist. It may have moved, or the link has a typo.</p>
      <Link to="/" className="btn-primary mt-8">Go to the home page</Link>
    </div>
  )
}

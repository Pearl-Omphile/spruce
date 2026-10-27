import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="flex min-h-[80dvh] flex-col justify-center text-center">
      <h1 className="text-[2.6rem]">Nothing to clean here</h1>
      <p className="mt-3 muted">This screen doesn't exist. The link may have a typo.</p>
      <Link to="/" className="btn-sand mx-auto mt-8">Go home</Link>
    </div>
  )
}

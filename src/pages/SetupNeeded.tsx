/** Shown when the build has no Supabase keys, so a fresh clone explains itself. */
export default function SetupNeeded() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1 className="text-4xl font-extrabold">Spruce needs a Supabase project</h1>
      <p className="mt-4 text-lg text-ink-soft">
        This build has no database keys. Copy <code className="rounded bg-mist px-1.5">.env.example</code> to{' '}
        <code className="rounded bg-mist px-1.5">.env.local</code>, add your Supabase project URL and anon key, run the SQL in{' '}
        <code className="rounded bg-mist px-1.5">supabase/</code>, then restart the dev server.
      </p>
    </div>
  )
}

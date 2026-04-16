interface IntroPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function IntroPage({ params }: IntroPageProps) {
  const { slug } = await params;

  return (
    <main className='flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-center text-white'>
      <div className='space-y-3'>
        <p className='text-xs uppercase tracking-[0.24em] text-neutral-400'>Invitation</p>
        <h1 className='text-2xl font-semibold'>Cinematic Intro</h1>
        <p className='text-sm text-neutral-300'>
          Guest access confirmed for <span className='font-medium text-white'>{slug}</span>.
          Intro sequence will be expanded in the next story.
        </p>
      </div>
    </main>
  );
}

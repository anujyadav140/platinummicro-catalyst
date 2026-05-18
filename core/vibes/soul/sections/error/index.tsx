import { Button } from '@/vibes/soul/primitives/button';

interface Props {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  ctaAction?: () => void | Promise<void>;
}

export function Error({
  title = 'Something went wrong!',
  subtitle = 'Please try again or contact our support team for assistance.',
  ctaLabel = 'Try again',
  ctaAction,
}: Props) {
  return (
    <section className="@container">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10 @xl:py-14 @4xl:px-8 @4xl:py-20">
        <h1 className="mb-3 font-heading text-2xl font-medium leading-tight sm:text-3xl @xl:text-4xl @4xl:text-5xl">
          {title}
        </h1>
        <p className="text-base text-contrast-500 sm:text-lg">{subtitle}</p>

        {ctaAction && (
          <form action={ctaAction}>
            <Button className="mt-6 sm:mt-8" size="large" type="submit" variant="primary">
              {ctaLabel}
            </Button>
          </form>
        )}
      </div>
    </section>
  );
}

/**
 * /dev/preview/account/settings
 * -----------------------------
 * Account Settings. Reads the FULL BC customer profile (not just the
 * Auth.js session) so company / phone show up populated for users that
 * supplied them at registration.
 *
 * Layout: a single sleek card with three sections divided by hairlines —
 * Profile, Password, Communications. Less chrome than the previous
 * 3-card stack, more breathable. Sign-out is a discrete action below
 * the form, never inside it.
 */
import { LogOut, ShieldCheck } from 'lucide-react';

import { fetchPmCustomerProfile } from '~/lib/pm-customer-profile';
import { getPmSessionCustomer } from '~/lib/pm-session-server';

import { signOutAction } from '../_actions/sign-out';
import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountPageHeader } from '../_components/page-header';
import { SettingsForm } from './_components/settings-form';

export default async function SettingsPage() {
  // Fetch the BC customer profile (full record) and the slim session
  // shape in parallel. Profile gives us company + phone; session is the
  // fallback for first/last/email if BC errors out.
  const [profile, sessionCustomer] = await Promise.all([
    fetchPmCustomerProfile(),
    getPmSessionCustomer(),
  ]);

  const defaults = {
    firstName: profile?.firstName ?? sessionCustomer?.firstName ?? '',
    lastName: profile?.lastName ?? sessionCustomer?.lastName ?? '',
    company: profile?.company ?? '',
    phone: profile?.phone ?? '',
    email: profile?.email ?? sessionCustomer?.email ?? '',
  };

  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Account settings"
        description="Profile details, password, and communication preferences for this business account."
      />

      <SettingsForm defaults={defaults} />

      {/* Sign-out — small, discrete, lives after the form so it's
          impossible to confuse with the primary submit. */}
      <section
        aria-labelledby="settings-session"
        className="flex flex-col gap-4 rounded-md border border-pm-ink-200 bg-white px-6 py-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pm-navy-pale text-pm-navy-mid"
          >
            <ShieldCheck size={16} strokeWidth={1.75} />
          </span>
          <div>
            <h2
              id="settings-session"
              className="text-[14px] font-bold text-pm-ink-900"
            >
              Active session
            </h2>
            <p className="text-[13px] leading-[1.5] text-pm-ink-500">
              Signed in as{' '}
              <span className="font-semibold text-pm-ink-700">
                {defaults.email}
              </span>
              . End the session below.
            </p>
          </div>
        </div>
        <form action={signOutAction} className="shrink-0">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-md border border-pm-ink-300 bg-white px-4 py-2 text-[13px] font-semibold text-pm-ink-900 transition-colors hover:border-pm-danger hover:bg-pm-danger-bg hover:text-pm-danger"
          >
            <LogOut size={13} strokeWidth={2} />
            Sign out
          </button>
        </form>
      </section>
    </PmAccountAreaLayout>
  );
}

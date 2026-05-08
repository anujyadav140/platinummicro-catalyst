/**
 * /dev/preview/account/messages
 * -----------------------------
 * Inbox for messages from the Platinum Micro sales / RMA team. Placeholder
 * surface until the real messaging integration ships (likely via B2B Ninja
 * threads or a custom Notion-backed inbox).
 */
import { MailOpen } from 'lucide-react';

import { PmAccountAreaLayout } from '../_components/account-area-layout';
import { PmAccountEmptyState } from '../_components/empty-state';
import { PmAccountPageHeader } from '../_components/page-header';

export default function MessagesPage() {
  return (
    <PmAccountAreaLayout>
      <PmAccountPageHeader
        title="Messages"
        description="Conversations with your account manager — order updates, quote replies, and RMA notes."
      />
      <PmAccountEmptyState
        icon={MailOpen}
        title="Inbox is clear"
        description="When your account manager replies to a quote or sends a status update, the message lands here."
        ctaLabel="Contact sales"
        ctaHref="/dev/preview/contact"
      />
    </PmAccountAreaLayout>
  );
}

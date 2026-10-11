import { seedApps } from "./seed/apps.ts";
import { seedReplyTemplates, seedSignature } from "./seed/reply-templates.ts";

/**
 * Tomokichi's starting data for inquiry-platform, in the shape of the
 * platform's `DeploymentSeed` (`apps/api/seed/types.ts` of the pinned release).
 *
 * `studio` is the service for questions about the Studio in general rather
 * than any one app, and where contacts naming no app are filed. Production has
 * had both since migration 0006; they are here so a fresh database ends up the
 * same.
 *
 *   node deploy/inquiry-platform/run.mjs seed --dry-run
 */
export default {
  apps: seedApps,
  replyTemplates: seedReplyTemplates,
  signature: seedSignature,
  services: [{ id: "studio", name: "tmkch.io", slug: "tmkch-io" }],
  defaultServiceId: "studio",
  mailSettings: [
    {
      appSlug: "zakkary",
      supportEmail: "support@zakkary.app",
      fromName: "Zakkaryカスタマーサポート",
      // Sender of the operator's "new ticket" alert only (number, kind and
      // a console link); nothing else on the platform sends from it.
      noreplyEmail: "notification@zakkary.app",
      notificationEmail: "zakkary001@gmail.com",
      // Zakkary's own admin; its inquiry screen lives under /admin/support.
      ticketUrlTemplate: "https://admin.zakkary.app/admin/support?ticket={ticketNumber}",
    },
    {
      // The travel blog. Its own name on replies and its own inbox for
      // notifications; the addresses stay on tmkch.io, whose sending domain
      // and inbound route already work, until tomokichidiary.com has both.
      appSlug: "tomokichi-diary",
      fromName: "ともきちの旅行日記",
      notificationEmail: "tomokichidiary@gmail.com",
      // The blog mails every contact to that inbox itself (and files a copy
      // here), so the platform's "new ticket" mail would be a second one.
      // Push still goes. inquiry-platform v0.3.3+.
      notifyByEmail: false,
      // Managed from the blog's own admin, not from the platform's gateway.
      ticketUrlTemplate: "https://admin.tomokichidiary.com/#/inquiries/{ticketNumber}",
    },
  ],
};

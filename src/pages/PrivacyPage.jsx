import LegalPage from './LegalPage'

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 22, 2026">
      <section>
        <h2>1. What we collect</h2>
        <ul>
          <li><strong>Account data</strong> — email, display name, tier.</li>
          <li><strong>Your content</strong> — boards, columns, cards, chat messages.</li>
          <li><strong>Usage data</strong> — product analytics events and error reports, tied to your account id.</li>
        </ul>
      </section>
      <section>
        <h2>2. How we use it</h2>
        <p>To run Kolumn: storing your boards, syncing them in realtime, powering AI features you invoke, sending the emails you request, and understanding aggregate product usage. We do not sell your data and we do not use your content to train AI models.</p>
      </section>
      <section>
        <h2>3. Processors</h2>
        <p>Your data is handled by the infrastructure we run on: Supabase (database, auth — encrypted in transit and at rest), Anthropic (processes the messages and board context you send to the assistant), Sentry (error reports), and PostHog (product analytics).</p>
      </section>
      <section>
        <h2>4. AI requests</h2>
        <p>When you use the assistant, the message you type and relevant board context are sent to Anthropic's API to generate the response. We send only what the feature needs.</p>
      </section>
      <section>
        <h2>5. Your controls</h2>
        <ul>
          <li>Export all boards and cards as JSON from Settings → Privacy.</li>
          <li>Delete your account from Settings → Account; content is removed from the live database.</li>
          <li>Revoke active sessions from Settings → Account.</li>
        </ul>
      </section>
      <section>
        <h2>6. Retention</h2>
        <p>Content is kept while your account exists. Deleted accounts are purged from the live database; residual copies in encrypted backups expire on the backup rotation schedule.</p>
      </section>
      <section>
        <h2>7. Changes and contact</h2>
        <p>Material changes to this policy will be announced in-app or by email. Questions: support@kolumn.app.</p>
      </section>
    </LegalPage>
  )
}

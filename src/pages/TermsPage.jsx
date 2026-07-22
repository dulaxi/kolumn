import LegalPage from './LegalPage'

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 22, 2026">
      <section>
        <h2>1. Agreement</h2>
        <p>By creating an account or using Kolumn, you agree to these Terms and confirm you are at least 18 years old. If you use Kolumn on behalf of an organization, you represent that you can bind that organization.</p>
      </section>
      <section>
        <h2>2. Your account</h2>
        <p>You are responsible for your credentials and for activity under your account. Keep your password safe and tell us promptly about any unauthorized use.</p>
      </section>
      <section>
        <h2>3. Your content</h2>
        <p>Boards, cards, and messages you create are yours. You grant us a limited license to store, process, and display that content solely to operate and improve the service infrastructure — we do not sell it and do not use it to train AI models.</p>
      </section>
      <section>
        <h2>4. Acceptable use</h2>
        <ul>
          <li>No unlawful, infringing, or abusive content or activity.</li>
          <li>No attempts to probe, disrupt, or overload the service.</li>
          <li>No reselling or scraping the service without written permission.</li>
        </ul>
      </section>
      <section>
        <h2>5. AI features</h2>
        <p>Kolumn's assistant is powered by third-party AI models. AI output can be wrong or incomplete; review it before relying on it. Destructive AI actions ask for confirmation, and deletes offer an undo, but you remain responsible for changes made in your workspace.</p>
      </section>
      <section>
        <h2>6. Plans and billing</h2>
        <p>Paid plans renew until cancelled. Where a trial is offered, you can cancel before it ends without charge. We will notify you before billing begins on any early-access plan.</p>
      </section>
      <section>
        <h2>7. Disclaimer and liability</h2>
        <p>Kolumn is provided "as is" without warranties of any kind, to the maximum extent permitted by law. To the same extent, our total liability for any claim is limited to the amount you paid us in the twelve months before the claim arose.</p>
      </section>
      <section>
        <h2>8. Termination</h2>
        <p>You can delete your account at any time in Settings. We may suspend or terminate accounts that violate these Terms. On deletion, your content is removed per the Privacy Policy.</p>
      </section>
      <section>
        <h2>9. Changes</h2>
        <p>We may update these Terms; material changes will be announced in-app or by email. Continued use after changes take effect means you accept them.</p>
      </section>
      <section>
        <h2>10. Contact</h2>
        <p>Questions: support@kolumn.app.</p>
      </section>
    </LegalPage>
  )
}

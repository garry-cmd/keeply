export const metadata = {
  title: 'Terms of Service | Keeply',
  description: 'Terms and conditions for using the Keeply vessel intelligence platform.',
};

const EFFECTIVE = 'April 4, 2026';
const CONTACT = 'support@keeply.boats';

export default function TermsPage() {
  return (
    <div
      style={{
        fontFamily: "'Georgia', serif",
        background: '#f8f9fa',
        minHeight: '100vh',
        padding: '0 0 80px',
      }}
    >
      {/* Page heading */}
      <div style={{ background: '#0f4c8a', padding: '28px 24px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <h1
            style={{
              color: '#fff',
              fontSize: 28,
              fontWeight: 700,
              margin: '0 0 6px',
              fontFamily: 'system-ui, sans-serif',
            }}
          >
            Terms of Service
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: 0, fontSize: 13 }}>
            Effective {EFFECTIVE}
          </p>
        </div>
      </div>

      {/* Body */}
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px' }}>
        <div
          style={{
            background: '#fff',
            borderRadius: 12,
            padding: '32px 36px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            lineHeight: 1.8,
            color: '#374151',
            fontSize: 15,
          }}
        >
          <p>
            These Terms of Service ("Terms") govern your use of the Keeply vessel intelligence
            platform ("Service"), operated by Keeply LLC ("Keeply", "we", "us", or "our"). By
            creating an account or using the Service, you agree to these Terms. If you don't agree,
            do not use the Service.
          </p>

          <Section title="1. The Service">
            <p>
              Keeply is a vessel management and intelligence platform that helps boat owners track
              maintenance, equipment, repairs, parts, logbook entries, and vessel identity
              information. The Service includes AI-powered features such as equipment
              identification, parts suggestions, and the First Mate assistant.
            </p>
            <p>
              <strong>Not a safety system.</strong> Keeply is an organisational and informational
              tool. It is not designed or intended to serve as a navigational aid, emergency system,
              or substitute for proper seamanship, professional marine inspection, or Coast Guard
              regulations. Do not rely on Keeply for decisions that affect safety at sea.
            </p>
          </Section>

          <Section title="2. Accounts">
            <p>
              You must sign in using Google OAuth to use the Service. You are responsible for
              maintaining the security of your Google account and for all activity that occurs under
              your Keeply account. You must be at least 13 years old (16 in the EU) to use Keeply.
            </p>
            <p>
              You may use Keeply for personal, non-commercial vessel management. You may not use the
              Service to manage vessels on behalf of others as a commercial service without our
              written permission.
            </p>
          </Section>

          <Section title="3. Subscriptions and Billing">
            <Sub title="Free tier">
              Keeply offers a free tier with limited features and vessel support.
            </Sub>
            <Sub title="Paid plans">
              Pro and Fleet plans are available on monthly or annual billing cycles. Prices are
              displayed at keeply.boats and in the app.
            </Sub>
            <Sub title="Payment">
              Payments are processed by Stripe. By subscribing, you authorise Stripe to charge your
              payment method on a recurring basis. All fees are in US dollars.
            </Sub>
            <Sub title="Cancellation">
              You may cancel your subscription at any time from the Profile section of the app.
              Cancellation takes effect at the end of your current billing period. We do not offer
              refunds for partial periods except where required by law.
            </Sub>
            <Sub title="Price changes">
              We may change subscription prices with 30 days notice. Continued use after a price
              change constitutes acceptance of the new price.
            </Sub>
          </Section>

          <Section title="4. Your Content">
            <p>
              You own the data you enter into Keeply — vessel information, maintenance records,
              photos, documents, and logbook entries. By uploading content to Keeply, you grant us a
              limited licence to store, process, and display it solely for the purpose of providing
              the Service to you.
            </p>
            <p>
              You are responsible for the accuracy of the information you enter. Keeply does not
              verify vessel identity information, certifications, or documentation status.
            </p>
            <p>
              You may not upload content that is illegal, harmful, or violates third-party rights.
              We reserve the right to remove content that violates these Terms.
            </p>
          </Section>

          <Section title="5. AI Features">
            <p>
              Keeply uses AI to provide equipment identification, parts recommendations, maintenance
              suggestions, and the First Mate assistant. These features:
            </p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>Are provided on an "as-is" basis and may not always be accurate</li>
              <li>Are informational suggestions, not professional marine advice</li>
              <li>
                Should be verified before acting on them, especially for safety-critical equipment
              </li>
              <li>Use Anthropic's Claude API to process your queries</li>
            </ul>
            <p>
              Parts search results and product links are provided for convenience. Keeply does not
              guarantee product availability, pricing accuracy, or compatibility with your specific
              vessel or equipment.
            </p>
          </Section>

          <Section title="6. Acceptable Use">
            <p>You agree not to:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>Reverse-engineer, scrape, or extract data from the Service</li>
              <li>Use the Service in any way that violates applicable law</li>
              <li>Attempt to gain unauthorised access to other users' data</li>
              <li>Use automated tools to access the Service at scale without permission</li>
              <li>Misrepresent your identity or vessel information in ways that harm others</li>
            </ul>
          </Section>

          <Section title="7. Affiliate Links">
            <p>
              Keeply's parts search feature provides links to marine retailers. Some of these links
              may be affiliate links through which Keeply earns a commission if you make a purchase.
              This commission does not affect the price you pay. We only link to products we believe
              are relevant to your search.
            </p>
          </Section>

          <Section title="8. Termination">
            <p>
              You may delete your account at any time from Profile → Delete Account. This
              permanently deletes your data within 30 days.
            </p>
            <p>
              We may suspend or terminate your account if you violate these Terms, engage in abusive
              behaviour, or if we determine continued service is not possible for legal or
              operational reasons. We will provide notice where reasonably practicable.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p
              style={{
                textTransform: 'uppercase',
                fontSize: 13,
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              The service is provided "as is" and "as available" without warranty of any kind. We do
              not warrant that the service will be uninterrupted, error-free, or free of harmful
              components. We make no warranties, express or implied, including warranties of
              merchantability, fitness for a particular purpose, or non-infringement.
            </p>
            <p>
              Keeply is not responsible for any damage to your vessel, equipment, or property
              arising from actions taken based on information provided by the Service.
            </p>
          </Section>

          <Section title="10. Vessel and Equipment Damage">
            <p>
              <strong>
                Keeply expressly disclaims all liability for any damage to, loss of, or
                deterioration of your vessel, its equipment, machinery, systems, or any other
                property arising directly or indirectly from:
              </strong>
            </p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>
                Maintenance tasks completed, skipped, or delayed based on Keeply reminders or
                schedules
              </li>
              <li>
                Parts purchased, installed, or ordered through or because of Keeply's parts
                suggestions or affiliate links
              </li>
              <li>
                Equipment identified, categorised, or described by Keeply's AI identification
                features
              </li>
              <li>Repairs logged, tracked, or prioritised using Keeply</li>
              <li>
                Any advice, suggestion, or recommendation provided by the First Mate AI assistant
              </li>
              <li>Inaccurate, incomplete, or missing maintenance records or alerts</li>
              <li>Service interruptions or data loss</li>
            </ul>
            <p>
              Keeply is a record-keeping and organisational tool. All decisions about vessel
              maintenance, repairs, and equipment are yours alone. You should always consult a
              qualified marine professional before undertaking maintenance or repairs on
              safety-critical systems. No feature of Keeply replaces professional marine inspection,
              certification, or survey.
            </p>
          </Section>

          <Section title="11. Limitation of Liability">
            <p
              style={{
                textTransform: 'uppercase',
                fontSize: 13,
                fontWeight: 600,
                color: '#6b7280',
              }}
            >
              To the fullest extent permitted by law, Keeply's total liability to you for any claim
              arising from these terms or your use of the service shall not exceed the amount you
              paid us in the 12 months preceding the claim, or $100, whichever is greater. We are
              not liable for indirect, incidental, special, consequential, or punitive damages.
            </p>
          </Section>

          <Section title="12. Indemnification">
            <p>
              You agree to indemnify and hold harmless Keeply and its officers, directors,
              employees, and agents from any claims, damages, or expenses (including reasonable
              legal fees) arising from your use of the Service, your violation of these Terms, or
              your violation of any third-party rights.
            </p>
          </Section>

          <Section title="13. Governing Law">
            <p>
              These Terms are governed by the laws of the State of Florida, United States, without
              regard to conflict of law principles. Any disputes shall be resolved in the courts of
              Miami-Dade County, Florida. If you are a consumer in the EU or UK, you may also have
              rights under your local consumer protection laws.
            </p>
          </Section>

          <Section title="14. Changes to These Terms">
            <p>
              We may update these Terms from time to time. We will notify you of material changes by
              email or in-app notice at least 14 days before they take effect. Continued use after
              changes constitutes acceptance.
            </p>
          </Section>

          <Section title="15. Contact">
            <p>
              Questions about these Terms? Email{' '}
              <a href={`mailto:${CONTACT}`} style={{ color: '#0f4c8a', fontWeight: 600 }}>
                {CONTACT}
              </a>
              .
            </p>
            <p style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>
              Keeply LLC · Miami-Dade County, FL, United States
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 32 }}>
      <h2
        style={{
          fontFamily: 'system-ui, sans-serif',
          fontSize: 18,
          fontWeight: 700,
          color: '#111827',
          marginBottom: 12,
          paddingBottom: 8,
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        {title}
      </h2>
      {children}
    </div>
  );
}

function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <strong style={{ color: '#111827' }}>{title}: </strong>
      {children}
    </div>
  );
}

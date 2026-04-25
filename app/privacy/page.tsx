export const metadata = {
  title: 'Privacy Policy | Keeply',
  description: 'How Keeply collects, uses, and protects your data.',
};

const EFFECTIVE = 'April 4, 2026';
const CONTACT = 'support@keeply.boats';

export default function PrivacyPage() {
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
            Privacy Policy
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
            Keeply ("we", "our", or "us") operates the Keeply vessel intelligence platform,
            available at keeply.boats and through our mobile applications. This policy explains what
            information we collect, how we use it, and your rights.
          </p>
          <p>
            By using Keeply, you agree to this policy. If you don't agree, please don't use the
            service.
          </p>

          <Section title="1. Information We Collect">
            <Sub title="Account information">
              When you sign in with Google OAuth, we receive your name and email address from
              Google. We do not receive or store your Google password.
            </Sub>
            <Sub title="Vessel and equipment data">
              Information you enter about your vessel — name, type, make, model, year, hull
              identification number (HIN), documentation number, MMSI, and other vessel identity
              fields — is stored so you can access it across devices.
            </Sub>
            <Sub title="Maintenance and operational records">
              Maintenance tasks, service logs, repair records, logbook entries, and notes you create
              are stored to power the core features of the app.
            </Sub>
            <Sub title="Documents and photos">
              Files you upload (manuals, certificates, photos, insurance documents) are stored in
              secure cloud storage. Photos used for AI equipment identification are sent to
              Anthropic's API and are not retained by Anthropic after processing.
            </Sub>
            <Sub title="Usage data">
              We collect standard server logs including IP addresses, browser/device type, pages
              visited, and feature usage. This helps us improve the product and diagnose issues.
            </Sub>
            <Sub title="Payment information">
              Subscription payments are processed by Stripe. We do not store your credit card number
              or payment credentials — Stripe handles all payment data under their own privacy
              policy and PCI-DSS compliance.
            </Sub>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>To provide, operate, and improve the Keeply service</li>
              <li>
                To power AI features — equipment identification, parts suggestions, and the First
                Mate assistant — using Anthropic's API
              </li>
              <li>
                To send transactional emails such as maintenance reminders and weekly digests via
                Resend
              </li>
              <li>To process your subscription payments via Stripe</li>
              <li>To respond to support requests sent to support@keeply.boats</li>
              <li>
                To analyse aggregate usage patterns and improve features (we do not sell individual
                user data)
              </li>
              <li>To comply with legal obligations</li>
            </ul>
            <p>
              We do not sell, rent, or trade your personal information to third parties for their
              marketing purposes.
            </p>
          </Section>

          <Section title="3. Third-Party Services">
            <p>Keeply uses the following third-party processors:</p>
            <table
              style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, marginTop: 8 }}
            >
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontFamily: 'system-ui',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    Service
                  </th>
                  <th
                    style={{
                      padding: '8px 12px',
                      textAlign: 'left',
                      fontFamily: 'system-ui',
                      borderBottom: '1px solid #e2e8f0',
                    }}
                  >
                    Purpose
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Supabase', 'Database and file storage'],
                  ['Anthropic', 'AI features (equipment ID, parts search, First Mate)'],
                  ['Stripe', 'Subscription billing and payment processing'],
                  ['Resend', 'Transactional email delivery'],
                  ['Vercel', 'Application hosting and deployment'],
                  ['Google', 'OAuth sign-in'],
                ].map(([svc, purpose], i) => (
                  <tr
                    key={svc}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                    }}
                  >
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>{svc}</td>
                    <td style={{ padding: '8px 12px' }}>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ marginTop: 12 }}>
              Each of these processors has their own privacy policies governing their use of your
              data. We encourage you to review them.
            </p>
          </Section>

          <Section title="4. Data Retention">
            <p>
              We retain your data for as long as your account is active. If you delete your account,
              we permanently delete your vessel data, equipment records, maintenance logs, uploaded
              documents, and account information within 30 days. Stripe retains billing records as
              required by financial regulations.
            </p>
          </Section>

          <Section title="5. Your Rights">
            <p>Depending on your location, you may have the following rights:</p>
            <ul style={{ paddingLeft: 20, margin: '8px 0' }}>
              <li>
                <strong>Access:</strong> Request a copy of your personal data
              </li>
              <li>
                <strong>Correction:</strong> Update inaccurate information (most data can be edited
                directly in the app)
              </li>
              <li>
                <strong>Deletion:</strong> Delete your account and all associated data via Profile →
                Delete Account
              </li>
              <li>
                <strong>Portability:</strong> Request your data in a portable format
              </li>
              <li>
                <strong>Objection:</strong> Object to certain types of processing
              </li>
            </ul>
            <p>
              To exercise any of these rights, email us at{' '}
              <a href={`mailto:${CONTACT}`} style={{ color: '#0f4c8a' }}>
                {CONTACT}
              </a>
              .
            </p>
          </Section>

          <Section title="6. Cookies">
            <p>
              Keeply uses essential cookies and local storage to maintain your session and
              preferences (such as dark mode). We do not use advertising or tracking cookies. We do
              not use third-party analytics cookies.
            </p>
          </Section>

          <Section title="7. Children's Privacy">
            <p>
              Keeply is not directed at children under 13 (or under 16 in the EU). We do not
              knowingly collect personal information from children. If you believe a child has
              provided us with personal information, please contact us at{' '}
              <a href={`mailto:${CONTACT}`} style={{ color: '#0f4c8a' }}>
                {CONTACT}
              </a>{' '}
              and we will delete it.
            </p>
          </Section>

          <Section title="8. Data Security">
            <p>
              We use industry-standard safeguards including encrypted connections (HTTPS/TLS),
              secure database access controls, and row-level security policies in our database. No
              method of transmission over the internet is 100% secure, and we cannot guarantee
              absolute security.
            </p>
          </Section>

          <Section title="9. International Transfers">
            <p>
              Keeply is operated from the United States. If you are located outside the US, your
              information may be transferred to and processed in the US. By using Keeply, you
              consent to this transfer.
            </p>
          </Section>

          <Section title="10. Changes to This Policy">
            <p>
              We may update this policy from time to time. We will notify you of material changes by
              email or by posting a notice in the app. Continued use of Keeply after changes
              constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="11. Contact">
            <p>
              Questions about this policy? Email us at{' '}
              <a href={`mailto:${CONTACT}`} style={{ color: '#0f4c8a', fontWeight: 600 }}>
                {CONTACT}
              </a>
              . We aim to respond within 5 business days.
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

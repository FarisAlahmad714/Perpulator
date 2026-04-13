import PriceIndicator from '@/components/PriceIndicator';

export default function PrivacyPage() {
  return (
    <>
      <PriceIndicator />
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl space-y-10">
          <div>
            <a href="/">
              <img src="/assets/logos/header.png" alt="Perpulator" className="h-12 w-auto mb-6" />
            </a>
            <h1 className="text-2xl font-700 text-white mb-1">Privacy Policy</h1>
            <p className="text-xs text-gray-600">Effective: April 12, 2025 · Mithril Labs LLC</p>
          </div>

          <div className="space-y-8 text-sm text-gray-400 leading-relaxed">

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">1. What We Collect</h2>
              <p>When you use Perpulator, we collect:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-gray-500">
                <li><strong className="text-gray-400">Account data</strong> — name, email address, and profile image from your OAuth provider (GitHub or Google)</li>
                <li><strong className="text-gray-400">Position data</strong> — trading positions you choose to save, stored in your account</li>
                <li><strong className="text-gray-400">API usage logs</strong> — endpoint called, HTTP status, timestamp, IP address, country, browser/tool identifier, and declared client name for API key holders</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">2. How We Use It</h2>
              <ul className="list-disc list-inside space-y-1 pl-2 text-gray-500">
                <li>To authenticate you and sync your positions across devices</li>
                <li>To enforce rate limits and detect abuse of the API</li>
                <li>To monitor service health and usage patterns</li>
              </ul>
              <p>We do not sell your data. We do not use it for advertising.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">3. Data Storage</h2>
              <p>Your data is stored in a Neon Postgres database hosted in the United States. We use Vercel for hosting, which may process requests through edge locations globally.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">4. Third-Party Services</h2>
              <ul className="list-disc list-inside space-y-1 pl-2 text-gray-500">
                <li><strong className="text-gray-400">GitHub / Google OAuth</strong> — used for sign-in only; we receive your name, email, and avatar</li>
                <li><strong className="text-gray-400">Twelve Data</strong> — provides live crypto price data; your queries are not tied to your identity</li>
                <li><strong className="text-gray-400">Vercel</strong> — hosts the application and injects geographic metadata (country) on incoming requests</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">5. Your Rights</h2>
              <p>You may request deletion of your account and all associated data at any time by contacting us. Deleting your account removes your saved positions and API keys from our systems.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">6. Cookies</h2>
              <p>We use a single session cookie to keep you signed in. We do not use tracking or advertising cookies.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">7. Contact</h2>
              <p>Privacy questions: <a href="mailto:farisalahmad714@gmail.com" className="text-neutral hover:underline">farisalahmad714@gmail.com</a></p>
            </section>
          </div>

          <div className="pt-6 border-t border-gray-800/50 flex gap-6">
            <a href="/terms" className="text-xs text-gray-500 hover:text-neutral transition-colors">Terms of Service</a>
            <a href="/" className="text-xs text-gray-500 hover:text-neutral transition-colors">Back to App</a>
          </div>
        </div>
      </div>
    </>
  );
}

import PriceIndicator from '@/components/PriceIndicator';

export default function TermsPage() {
  return (
    <>
      <PriceIndicator />
      <div className="flex flex-col items-center min-h-screen px-4 sm:px-6 py-12 sm:py-16">
        <div className="w-full max-w-2xl space-y-10">
          <div>
            <a href="/">
              <img src="/assets/logos/header.png" alt="Perpulator" className="h-12 w-auto mb-6" />
            </a>
            <h1 className="text-2xl font-700 text-white mb-1">Terms of Service</h1>
            <p className="text-xs text-gray-600">Effective: April 12, 2025 · Mithril Labs LLC</p>
          </div>

          <div className="space-y-8 text-sm text-gray-400 leading-relaxed">

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">1. Acceptance</h2>
              <p>By accessing or using Perpulator ("the Service"), you agree to be bound by these Terms. If you disagree, do not use the Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">2. Description</h2>
              <p>Perpulator is a perpetual futures position calculator and analysis tool. It provides educational and informational output only. Nothing on this Service constitutes financial, investment, or trading advice.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">3. API Usage</h2>
              <p>API keys are issued for personal, non-commercial use only. The following are strictly prohibited:</p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-gray-500">
                <li>Reselling or sublicensing API access to third parties</li>
                <li>Building commercial products or services on top of the API without written permission</li>
                <li>Automated bulk requests designed to circumvent rate limits</li>
                <li>Using the API in any way that competes with or monetizes Perpulator's core functionality</li>
              </ul>
              <p>Mithril Labs LLC reserves the right to revoke any API key at any time, with or without notice, for any violation of these terms.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">4. No Financial Advice</h2>
              <p>All calculations, risk metrics, and analysis provided by Perpulator are for informational and educational purposes only. Perpetual futures trading involves significant risk of loss. You are solely responsible for your trading decisions. Mithril Labs LLC accepts no liability for any financial losses incurred.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">5. Accounts & Security</h2>
              <p>You are responsible for maintaining the security of your account and API keys. Do not share your keys. You must notify us immediately of any unauthorized use at <a href="mailto:farisalahmad714@gmail.com" className="text-neutral hover:underline">farisalahmad714@gmail.com</a>.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">6. Availability</h2>
              <p>The Service is provided "as is" without warranty of any kind. We do not guarantee uptime, accuracy of price data, or uninterrupted access. Price data is sourced from third-party providers and may be delayed or inaccurate.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">7. Limitation of Liability</h2>
              <p>To the maximum extent permitted by law, Mithril Labs LLC shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">8. Changes</h2>
              <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-600 text-white uppercase tracking-widest">9. Contact</h2>
              <p>Questions about these Terms: <a href="mailto:farisalahmad714@gmail.com" className="text-neutral hover:underline">farisalahmad714@gmail.com</a></p>
            </section>
          </div>

          <div className="pt-6 border-t border-gray-800/50 flex gap-6">
            <a href="/privacy" className="text-xs text-gray-500 hover:text-neutral transition-colors">Privacy Policy</a>
            <a href="/" className="text-xs text-gray-500 hover:text-neutral transition-colors">Back to App</a>
          </div>
        </div>
      </div>
    </>
  );
}

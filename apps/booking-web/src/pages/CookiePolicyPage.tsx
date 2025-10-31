import { Link } from 'react-router-dom';

export function CookiePolicyPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-brand-black">Cookie Policy</h1>
        <p className="text-sm text-slate-600">
          This policy explains what cookies are, how we use them on this website, and how you can control them. For details
          about how we use personal data more broadly, please see our{' '}
          <Link to="/privacy" className="font-semibold text-brand-orange hover:underline">Privacy Notice</Link>.
        </p>
      </section>

      <section className="space-y-6 text-sm text-slate-600">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">What are cookies?</h2>
          <p>
            Cookies are small text files placed on your device by websites you visit. They are widely used to make websites
            work, or work more efficiently, as well as to provide information to site owners. Cookies can be “session”
            cookies (which expire when you close your browser) or “persistent” cookies (which remain for a set period or
            until you delete them). Cookies cannot run programs or deliver viruses.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Can cookies harm your device?</h2>
          <p>
            No. Cookies are simple text files. They do not give us access to your computer, and they cannot be used to
            install software or run code. You remain in control of cookies through your browser settings.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Types of cookies we use</h2>
          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className="font-semibold">Strictly necessary</span> — required for the website to function (e.g. security,
              network management, login/session). You cannot disable these via our site.
            </li>
            <li>
              <span className="font-semibold">Performance</span> — help us understand how visitors use the site (e.g.
              aggregated statistics) so we can improve performance and content.
            </li>
            <li>
              <span className="font-semibold">Functional</span> — remember your choices and preferences to provide enhanced,
              more personal features (e.g. remembering a cookie banner dismissal).
            </li>
            <li>
              <span className="font-semibold">Targeting/Advertising</span> — used to deliver relevant adverts or limit how often
              you see an ad. We do not use behavioural advertising on this site, but third-party services integrated for
              security or analytics may set cookies in this category.
            </li>
          </ul>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Cookies on this website</h2>
          <p>
            The cookies we use may change over time as we improve our website. Below are common examples of cookies you may
            encounter when using this site. Cookie names can vary by browser and provider.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Purpose</th>
                  <th className="py-2 pr-4">Type</th>
                  <th className="py-2">Expiry</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-mono text-xs">session</td>
                  <td className="py-2 pr-4">Maintains your session for necessary site functions.</td>
                  <td className="py-2 pr-4">Strictly necessary</td>
                  <td className="py-2">Session</td>
                </tr>
                <tr className="border-b border-slate-100">
                  <td className="py-2 pr-4 font-mono text-xs">__cf_bm / cf_* (Cloudflare/Turnstile)</td>
                  <td className="py-2 pr-4">Security and bot protection for forms and login/booking steps.</td>
                  <td className="py-2 pr-4">Strictly necessary</td>
                  <td className="py-2">Up to 30 minutes</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono text-xs">_ga, _gid (Analytics)</td>
                  <td className="py-2 pr-4">Anonymous usage analytics to improve the site.</td>
                  <td className="py-2 pr-4">Performance</td>
                  <td className="py-2">Varies (e.g. 1 day – 2 years)</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-slate-500">Note: We do not use cookies to store sensitive personal information.</p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">How to manage cookies</h2>
          <p>
            Most web browsers allow control of cookies through settings. You can usually find these settings in the
            “Options”, “Settings” or “Preferences” menu. You can also clear existing cookies at any time.
          </p>
          <ul className="list-disc space-y-2 pl-6">
            <li>Block all cookies or only third‑party cookies.</li>
            <li>Delete cookies when you close your browser.</li>
            <li>Receive a prompt before a cookie is stored.</li>
          </ul>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">More information</h2>
          <p>
            For independent advice about cookies, see{' '}
            <a href="https://www.allaboutcookies.org/" className="font-semibold text-brand-orange hover:underline" target="_blank" rel="noreferrer">All About Cookies</a>{' '}
            and the UK Information Commissioner’s Office guide to cookies at{' '}
            <a href="https://ico.org.uk/for-the-public/online/cookies/" className="font-semibold text-brand-orange hover:underline" target="_blank" rel="noreferrer">ico.org.uk</a>.
          </p>
        </article>

        <p className="text-xs text-slate-500">Last updated: October 2025</p>
      </section>
    </div>
  );
}

export default CookiePolicyPage;


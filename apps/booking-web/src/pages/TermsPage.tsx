import { Link } from 'react-router-dom';

export function TermsPage() {
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-3xl font-semibold text-brand-black">Terms and Conditions</h1>
        <p className="text-sm text-slate-600">
          In using this website you are deemed to have read and agreed to the following terms and conditions. Please also
          review our <Link to="/privacy" className="font-semibold text-brand-orange hover:underline">Privacy Notice</Link> which forms part of these terms.
        </p>
      </section>

      <section className="space-y-6 text-sm text-slate-600">
        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Definitions</h2>
          <p>
            &ldquo;Client&rdquo;, &ldquo;You&rdquo; and &ldquo;Your&rdquo; refers to you, the person accessing this website and accepting the Company&rsquo;s terms
            and conditions. &ldquo;The Company&rdquo;, &ldquo;Ourselves&rdquo;, &ldquo;We&rdquo; and &ldquo;Us&rdquo; refers to A1 Service Expert Ltd. &ldquo;Party&rdquo;,
            &ldquo;Parties&rdquo;, or &ldquo;Us&rdquo; refers to both the Client and ourselves, or either the Client or ourselves. Any use of the
            above terminology or other words in the singular, plural, capitalisation and/or he/she or they, are taken as
            interchangeable and therefore as referring to the same.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Privacy Policy</h2>
          <p>
            Refer to our <Link to="/privacy" className="font-semibold text-brand-orange hover:underline">Privacy Notice</Link> for information on how we handle your data. By using this site you agree to that policy.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Exclusions and Limitations</h2>
          <p>
            The information on this website is provided on an &ldquo;as is&rdquo; basis. To the fullest extent permitted by law, A1
            Service Expert Ltd excludes all representations and warranties relating to this website and its contents or
            which may be provided by any affiliates or any other third party. We exclude all liability for damages arising
            out of or in connection with your use of this website, including direct loss, loss of business or profits,
            damage to your computer or other incidental damages. Nothing excludes liability for death or personal injury
            caused by our negligence. Your statutory rights as a consumer are unaffected.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Availability</h2>
          <p>
            Unless otherwise stated, the services featured on this website are only available within the United Kingdom.
            All advertising is intended solely for the United Kingdom market. You are solely responsible for evaluating the
            fitness for a particular purpose of any downloads, programs and text available through this site. We do not
            warrant that the service from this site will be uninterrupted, timely or error free.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Log Files &amp; Cookies</h2>
          <p>
            We use IP addresses to analyse trends, administer the site and gather broad demographic information. Like most
            interactive websites, cookies are used to enable functionality. Please see the Cookie Notice within our Privacy
            Notice for further information.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Links</h2>
          <p>
            Any links from or to this website are followed at your own risk. We do not monitor or review content on other
            websites and accept no responsibility for any loss or damage resulting from disclosing personal information to
            third parties.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Copyright</h2>
          <p>Copyright and other relevant intellectual property rights exist on all text and content of this website.</p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Governing Law</h2>
          <p>
            The laws of England and Wales govern these terms and conditions. By accessing this website you consent to these
            terms and to the exclusive jurisdiction of the English courts in all disputes arising out of such access.
          </p>
        </article>

        <article className="space-y-3">
          <h2 className="text-lg font-semibold text-brand-black">Changes</h2>
          <p>
            We reserve the right to change these conditions at any time. Continued use of the site signifies acceptance of
            any adjustments. It is your responsibility to review this statement regularly.
          </p>
        </article>

        <p className="text-xs text-slate-500">&copy; A1 Service Expert Ltd. All Rights Reserved.</p>
      </section>
    </div>
  );
}

export default TermsPage;

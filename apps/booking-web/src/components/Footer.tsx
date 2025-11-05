import { Link } from 'react-router-dom';
import logo from '../assets/logo-new.webp';

export default function Footer() {
  const whatsappHref = 'https://wa.me/447394433889';
  return (
    <footer className="border-t border-slate-800 bg-slate-900 py-10 text-slate-300">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Link to="/" className="inline-flex items-center" aria-label="A1 Service Expert home">
            <img src={logo} alt="A1 Service Expert" className="h-32 w-auto sm:h-36 lg:h-40" />
          </Link>
          <p className="mt-3 text-sm">Independent specialists for servicing, diagnostics, and repairs.</p>
        </div>
        <nav aria-label="Quick links">
          <p className="text-sm font-semibold text-white">Quick Links</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link to="/" className="hover:text-brand-orange">Home</Link></li>
            <li><Link to="/services" className="hover:text-brand-orange">Services</Link></li>
            <li><Link to="/online-booking" className="hover:text-brand-orange">Book Online</Link></li>
            <li><Link to="/contact" className="hover:text-brand-orange">Contact</Link></li>
            <li><Link to="/terms" className="hover:text-brand-orange">Terms</Link></li>
            <li><Link to="/privacy" className="hover:text-brand-orange">Privacy</Link></li>
            <li><Link to="/cookie-policy" className="hover:text-brand-orange">Cookie Policy</Link></li>
          </ul>
        </nav>
        <div>
          <p className="text-sm font-semibold text-white">Contact</p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="tel:07394433889"
              aria-label="Call 07394 433889"
              className="inline-flex h-11 items-center justify-center rounded-full bg-brand-orange px-5 text-sm font-semibold text-white transition hover:bg-orange-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <span aria-hidden className="mr-2 inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 0 1 2-2h2.28a2 2 0 0 1 1.94 1.515l.74 2.964a2 2 0 0 1-.97 2.26l-1.21.726a11 11 0 0 0 5.1 5.1l.73-1.21a2 2 0 0 1 2.26-.97l2.96.74A2 2 0 0 1 21 18.72V21a2 2 0 0 1-2 2h-1c-8.284 0-15-6.716-15-15V5Z" /></svg></span>
              Call 07394 433889
            </a>
            <a
              href="mailto:support@a1serviceexpert.com"
              aria-label="Email support@a1serviceexpert.com"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-orange px-5 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7h18M5 7l5.5 4.5a3 3 0 0 0 4 0L20 7M5 7v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7" /></svg></span>
              Email support@a1serviceexpert.com
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              aria-label="Chat on WhatsApp"
              title="Chat on WhatsApp"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-brand-orange px-5 text-sm font-semibold text-brand-orange transition hover:bg-brand-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
            >
              <span aria-hidden className="inline-flex"><svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.47 0 .1 5.37.1 12c0 2.12.56 4.14 1.62 5.94L0 24l6.2-1.6A11.86 11.86 0 0 0 12.06 24c6.58 0 11.94-5.37 11.94-12 0-3.2-1.25-6.2-3.48-8.52Zm-8.46 18.5c-1.86 0-3.63-.5-5.2-1.47l-.37-.22-3.68.95.98-3.58-.24-.37A9.65 9.65 0 0 1 2.3 12c0-5.38 4.38-9.76 9.76-9.76 2.6 0 5.06 1 6.9 2.83a9.66 9.66 0 0 1 2.86 6.93c0 5.38-4.38 9.76-9.76 9.76Zm5.63-7.3c-.3-.15-1.78-.88-2.06-.98-.28-.1-.49-.15-.7.15-.2.3-.8.98-.98 1.18-.2.2-.36.23-.66.08-.3-.15-1.25-.46-2.38-1.46-.88-.78-1.48-1.74-1.66-2.04-.18-.3 0-.47.14-.62.14-.14.3-.36.46-.54.15-.18.2-.3.3-.5.1-.2.05-.38-.03-.54-.08-.15-.7-1.68-.96-2.3-.25-.6-.5-.5-.7-.51h-.6c-.2 0-.54.07-.82.38-.28.3-1.08 1.06-1.08 2.58 0 1.5 1.1 2.94 1.26 3.14.15.2 2.12 3.24 5.14 4.54.72.3 1.28.48 1.72.62.72.23 1.38.2 1.9.12.58-.08 1.78-.72 2.03-1.4.26-.7.26-1.3.2-1.4-.08-.12-.28-.2-.58-.35Z"/></svg></span>
              WhatsApp
            </a>
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Socials</p>
          <div className="mt-3 flex items-center gap-3">
            <a
              href="https://www.facebook.com/p/A1-Service-Expert-61559306016998/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-orange text-brand-orange transition hover:bg-brand-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label="Facebook"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M22 12a10 10 0 1 0-11.5 9.87v-6.99H7.9V12h2.6V9.79c0-2.57 1.53-4 3.86-4 1.12 0 2.29.2 2.29.2v2.52h-1.29c-1.27 0-1.66.79-1.66 1.6V12h2.83l-.45 2.88h-2.38v6.99A10 10 0 0 0 22 12Z" />
              </svg>
            </a>
            <a
              href="https://www.instagram.com/a1service.expert/?hl=en"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-brand-orange text-brand-orange transition hover:bg-brand-orange hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange"
              aria-label="Instagram"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor">
                <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3Zm-5 3.5A5.5 5.5 0 1 1 6.5 13 5.5 5.5 0 0 1 12 7.5Zm0 2A3.5 3.5 0 1 0 15.5 13 3.5 3.5 0 0 0 12 9.5Zm5-2.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 17 6.75Z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
      <div className="mt-8 border-t border-slate-800 pt-4">
        <p className="mx-auto max-w-6xl px-4 text-center text-xs text-slate-400">
          © 2025 A1 Service Expert. All rights reserved | Website Design & Development by
          {' '}<a href="https://www.linkedin.com/in/nicolae-sterian/" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-orange underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">Nicolae Sterian</a>
        </p>
      </div>
    </footer>
  );
}

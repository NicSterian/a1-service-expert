import { Link } from 'react-router-dom';
import logo from '../assets/logo-a1.png';

type HeaderLogoProps = {
  variant?: 'desktop' | 'mobile';
};

export default function HeaderLogo({ variant = 'desktop' }: HeaderLogoProps) {
  if (variant === 'mobile') {
    return (
      <Link
        to="/"
        className="inline-flex items-center sm:hidden"
        aria-label="A1 Service Expert home"
        title="A1 Service Expert"
      >
        <img src={logo} alt="A1 Service Expert" className="h-16 w-auto" />
      </Link>
    );
  }

  return (
    <div className="hidden sm:flex w-full items-center justify-center py-6">
      <Link to="/" aria-label="A1 Service Expert home" title="A1 Service Expert" className="inline-flex">
        <img src={logo} alt="A1 Service Expert" className="h-40 w-auto max-h-40" />
      </Link>
    </div>
  );
}

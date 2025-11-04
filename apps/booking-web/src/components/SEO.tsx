/**
 * SEO Component - Manages page metadata
 * 
 * Provides comprehensive meta tags for:
 * - Search engines (Google, Bing)
 * - Social media (Facebook, Twitter, LinkedIn)
 * - Structured data (JSON-LD)
 * 
 * Usage:
 * <SEO
 *   title="MOT & Service Booking | A1 Service Expert"
 *   description="Book your MOT test and car service online in Kettering..."
 *   type="website"
 * />
 * 
 * @see docs/SEO.md for SEO best practices
 */

import { Helmet } from 'react-helmet-async';

interface SEOProps {
  /** Page title (will append "| A1 Service Expert" if not included) */
  title: string;
  
  /** Meta description (150-160 characters recommended) */
  description: string;
  
  /** Open Graph type */
  type?: 'website' | 'article' | 'service';
  
  /** Open Graph image URL (absolute or relative) */
  image?: string;
  
  /** Canonical URL (defaults to current page) */
  canonicalUrl?: string;
  
  /** SEO keywords (optional, not heavily weighted by search engines) */
  keywords?: string[];
  
  /** Structured data (Schema.org JSON-LD) */
  structuredData?: object | object[];
  
  /** Prevent indexing (use for admin/account pages) */
  noIndex?: boolean;
}

export function SEO({
  title,
  description,
  type = 'website',
  image = '/media/og-default.jpg',
  canonicalUrl,
  keywords = [],
  structuredData,
  noIndex = false,
}: SEOProps) {
  // Site configuration
  const siteUrl = import.meta.env.VITE_SITE_URL || 'https://a1serviceexpert.com';
  
  // Ensure title includes site name
  const fullTitle = title.includes('A1 Service Expert')
    ? title
    : `${title} | A1 Service Expert`;
  
  // Build absolute image URL
  const fullImageUrl = image.startsWith('http') 
    ? image 
    : `${siteUrl}${image}`;
  
  // Build canonical URL
  const fullCanonicalUrl = canonicalUrl || (typeof window !== 'undefined' ? window.location.href : siteUrl);

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords.length > 0 && (
        <meta name="keywords" content={keywords.join(', ')} />
      )}
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullCanonicalUrl} />
      
      {/* Robots */}
      {noIndex ? (
        <meta name="robots" content="noindex, nofollow" />
      ) : (
        <meta name="robots" content="index, follow" />
      )}
      
      {/* Open Graph (Facebook, LinkedIn) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:url" content={fullCanonicalUrl} />
      <meta property="og:site_name" content="A1 Service Expert" />
      <meta property="og:locale" content="en_GB" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImageUrl} />
      
      {/* Structured Data (JSON-LD) */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(structuredData) ? structuredData : structuredData
          )}
        </script>
      )}
    </Helmet>
  );
}

/**
 * Helper: Create LocalBusiness structured data
 * Use on homepage and contact page
 * 
 * @example
 * <SEO structuredData={createLocalBusinessSchema()} />
 */
export function createLocalBusinessSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AutoRepair',
    name: 'A1 Service Expert',
    description: 'Professional MOT testing and car servicing in Kettering, Northamptonshire',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '11 Cunliffe Dr',
      addressLocality: 'Kettering',
      postalCode: 'NN16 8LD',
      addressCountry: 'GB',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 52.3988,  // Update with actual coordinates
      longitude: -0.7261,
    },
    telephone: '+447394433889',
    email: 'support@a1serviceexpert.com',
    url: 'https://a1serviceexpert.com',
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '09:00',
        closes: '17:00',
      },
    ],
    priceRange: '££',
    image: 'https://a1serviceexpert.com/media/og-home.jpg',
    sameAs: [
      // Add social media URLs when available
      // 'https://facebook.com/a1serviceexpert',
      // 'https://www.instagram.com/a1serviceexpert',
    ],
  };
}

/**
 * Helper: Create Service schema for services page
 * 
 * @example
 * <SEO structuredData={createServiceSchema('MOT Test', 'Comprehensive MOT testing')} />
 */
export function createServiceSchema(serviceName: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: serviceName,
    description: description,
    provider: {
      '@type': 'AutoRepair',
      name: 'A1 Service Expert',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '11 Cunliffe Dr',
        addressLocality: 'Kettering',
        postalCode: 'NN16 8LD',
        addressCountry: 'GB',
      },
      telephone: '+447394433889',
    },
    areaServed: {
      '@type': 'City',
      name: 'Kettering',
    },
  };
}

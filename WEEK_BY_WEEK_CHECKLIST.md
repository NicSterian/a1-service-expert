# A1 Service Expert - 4-Week Improvement Checklist

**Start Date:** November 4, 2025  
**End Date:** November 29, 2025  
**Objective:** Code cleanup + Documentation + Google Analytics + SEO

---

## ✅ Week 1: Documentation + Analytics/SEO Setup (Nov 4-8)

### Monday - Setup & Planning
- [ ] Review improvement plan with team
- [ ] Create Google Analytics 4 property
- [ ] Get GA4 Measurement ID (G-XXXXXXXXXX)
- [ ] Set up conversion goals in GA4 dashboard
- [ ] Install `react-ga4` package: `pnpm add --filter booking-web react-ga4`
- [ ] Install `react-helmet-async`: `pnpm add --filter booking-web react-helmet-async`
- [ ] Create `.env.local` with `VITE_GA_MEASUREMENT_ID`
- [ ] Run baseline Lighthouse audit and save report

### Tuesday - Backend Documentation + Analytics Core
- [ ] Document `apps/booking-api/src/bookings/bookings.service.ts` (Sections 1-2)
  - [ ] File-level JSDoc
  - [ ] `confirmBooking()` method
  - [ ] `createManualBooking()` method
- [ ] Create `apps/booking-web/src/lib/analytics.ts`
- [ ] Add analytics initialization to `App.tsx`
- [ ] Add page view tracking with `useLocation()`
- [ ] Test GA4 in browser console (check `window.gtag`)
- [ ] Verify realtime tracking in GA4 dashboard

### Wednesday - Documents Service + Funnel Tracking
- [ ] Document `apps/booking-api/src/documents/documents.service.ts`
  - [ ] File-level JSDoc
  - [ ] `generatePdf()` method
  - [ ] PDF rendering logic
  - [ ] Logo handling explanation
- [ ] Add funnel tracking to `BookingWizard.tsx`
- [ ] Add conversion tracking to `SuccessPage.tsx`
- [ ] Add DVLA lookup tracking to vehicle modal
- [ ] Test booking funnel tracking end-to-end

### Thursday - SEO Foundation
- [ ] Create `apps/booking-web/src/components/SEO.tsx`
- [ ] Wrap app in `<HelmetProvider>` in `main.tsx`
- [ ] Add SEO to `HomePage.tsx`
  - [ ] Meta tags (title, description, keywords)
  - [ ] LocalBusiness structured data
  - [ ] Open Graph tags
- [ ] Add SEO to `ServicesPage.tsx`
  - [ ] Service catalog structured data
- [ ] Update `apps/booking-web/index.html`
  - [ ] Add favicon links
  - [ ] Add theme-color meta tag
  - [ ] Add default meta description

### Friday - SEO Completion & Review
- [ ] Add SEO to remaining pages:
  - [ ] `AirConPage.tsx`
  - [ ] `DiagnosticsPage.tsx`
  - [ ] `ContactPage.tsx`
  - [ ] `BookingWizard.tsx`
  - [ ] `AccountPage.tsx` (noindex)
  - [ ] Admin pages (noindex)
- [ ] Create `apps/booking-api/src/routes/sitemap.controller.ts`
- [ ] Register SitemapController in `app.module.ts`
- [ ] Test sitemap: `curl http://localhost:3000/sitemap.xml`
- [ ] Test robots.txt: `curl http://localhost:3000/robots.txt`
- [ ] Team code review
- [ ] Run Lighthouse audit (compare with baseline)
- [ ] Document Week 1 progress

**Week 1 Success Criteria:**
- ✅ GA4 tracking all page views
- ✅ Booking conversions tracked
- ✅ All pages have SEO meta tags
- ✅ Sitemap.xml generated
- ✅ 3 core service files documented

---

## ✅ Week 2: Code Cleanup + SEO Enhancement (Nov 11-15)

### Monday - Constants Extraction
- [ ] Create `apps/booking-api/src/common/constants.ts`
  - [ ] Add timing constants (HOLD_EXPIRY_MINUTES, PDF_RENDER_DELAY_MS)
  - [ ] Add formatting constants (BOOKING_REFERENCE_FORMAT, etc.)
  - [ ] Add file path constants
  - [ ] Add business rule constants (VAT_RATE_PERCENT)
- [ ] Update `bookings.service.ts` to use constants
- [ ] Update `documents.service.ts` to use constants
- [ ] Update `pdf.service.ts` to use constants
- [ ] Search and replace all hardcoded values
- [ ] Run tests to verify no breakage

### Tuesday - Dead Code Removal + Image Optimization
- [ ] Delete `apps/booking-web/src/pages/DevPage.tsx`
- [ ] Delete `apps/booking-web/src/pages/VerifyEmailPage.tsx`
- [ ] Remove commented code blocks in `bookings.service.ts` (lines 414-509)
- [ ] Search for `// OLD:` comments and remove
- [ ] Search for `/* REMOVED` comments and remove
- [ ] Clean up unused imports (ESLint autofix)
- [ ] Compress images in `apps/booking-web/public/media`
- [ ] Add alt text to all `<img>` tags
- [ ] Verify build succeeds: `pnpm --filter booking-web build`

### Wednesday - SEO Content Enhancement
- [ ] Add FAQ section to `HomePage.tsx`
  - [ ] Common questions about MOT, servicing, pricing
  - [ ] FAQ structured data (FAQPage schema)
- [ ] Improve service descriptions on `ServicesPage.tsx`
- [ ] Add customer testimonials section to `HomePage.tsx`
- [ ] Create testimonials data file
- [ ] Add Review structured data for testimonials
- [ ] Internal linking between related pages

### Thursday - Component Extraction + Analytics Review
- [ ] Create `apps/booking-web/src/components/admin/StatusBadge.tsx`
- [ ] Create `apps/booking-web/src/components/admin/BookingSourceBadge.tsx`
- [ ] Create `apps/booking-web/src/components/admin/EditableField.tsx`
- [ ] Create `apps/booking-web/src/components/forms/FormInput.tsx`
- [ ] Update admin pages to use new components
- [ ] Review GA4 data from Week 1
- [ ] Check funnel drop-off points
- [ ] Adjust tracking if needed

### Friday - Local SEO
- [ ] Verify LocalBusiness structured data
- [ ] Add opening hours to structured data
- [ ] Add payment methods accepted
- [ ] Create location-specific content
- [ ] Build local citations list (directories to submit to)
- [ ] Set up Google My Business (if not done)
- [ ] Add GMB link to website footer

**Week 2 Success Criteria:**
- ✅ No magic numbers in codebase
- ✅ No dead code
- ✅ All images optimized with alt text
- ✅ FAQ section added
- ✅ Reusable components extracted

---

## ✅ Week 3: Type Safety & Performance (Nov 18-22)

### Monday - TypeScript Improvements (Part 1)
- [ ] Search for `: any` types in backend
- [ ] Replace with proper interfaces
- [ ] Create shared type definitions in `packages/shared/src/types.ts`
- [ ] Add Zod schemas for validation
- [ ] Fix resulting type errors

### Tuesday - TypeScript Improvements (Part 2)
- [ ] Search for `: any` types in frontend
- [ ] Replace with proper interfaces
- [ ] Create `apps/booking-web/src/types/` directory
- [ ] Add types for API responses
- [ ] Add types for admin interfaces
- [ ] Run `tsc` to verify no errors

### Wednesday - Frontend Documentation
- [ ] Document `AdminBookingDetailPage.tsx`
  - [ ] File-level overview
  - [ ] Section comments
  - [ ] Event handler explanations
- [ ] Document `InvoiceEditor.tsx`
  - [ ] Form state management
  - [ ] Calculation logic
  - [ ] Save/issue/email flows

### Thursday - Performance Optimization
- [ ] Add lazy loading to images
- [ ] Implement route-based code splitting
- [ ] Analyze bundle size: `pnpm --filter booking-web build --analyze`
- [ ] Optimize FullCalendar imports (tree shaking)
- [ ] Add loading states for async operations
- [ ] Run Lighthouse audit

### Friday - Review & Testing
- [ ] Code review session
- [ ] Address feedback
- [ ] Check GA4 data quality
- [ ] Verify all analytics events
- [ ] Test on mobile devices
- [ ] Document Week 3 progress

**Week 3 Success Criteria:**
- ✅ <20 `any` types remaining
- ✅ Admin pages documented
- ✅ Performance score improved
- ✅ Mobile experience optimized

---

## ✅ Week 4: Testing & Launch Prep (Nov 25-29)

### Monday - Unit Tests
- [ ] Create `apps/booking-api/src/common/utils/date.utils.spec.ts`
- [ ] Create `apps/booking-api/src/common/utils/error.utils.spec.ts`
- [ ] Add tests for booking service methods
- [ ] Add tests for document service methods
- [ ] Run tests: `pnpm --filter booking-api test`

### Tuesday - SEO Validation
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Verify structured data: [Google Rich Results Test](https://search.google.com/test/rich-results)
- [ ] Check mobile-friendliness: [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)
- [ ] Validate Open Graph tags: [Facebook Debugger](https://developers.facebook.com/tools/debug/)
- [ ] Validate Twitter Cards: [Twitter Card Validator](https://cards-dev.twitter.com/validator)

### Wednesday - Integration Testing + Analytics QA
- [ ] Test complete booking flow (online)
- [ ] Test manual booking creation (admin)
- [ ] Test document generation and email
- [ ] Test user registration
- [ ] Verify GA4 events fire:
  - [ ] Page views
  - [ ] Funnel steps
  - [ ] Booking conversion
  - [ ] Vehicle lookup
  - [ ] Document download
- [ ] Check funnel reports in GA4
- [ ] Verify conversion tracking accuracy

### Thursday - Final SEO Audit
- [ ] Run final Lighthouse audit (Desktop)
- [ ] Run final Lighthouse audit (Mobile)
- [ ] Compare with baseline from Week 1
- [ ] Fix any critical issues found
- [ ] Test social media sharing
- [ ] Check all external links (contact, WhatsApp)
- [ ] Verify canonical URLs on all pages

### Friday - Deployment Preparation
- [ ] Final QA pass on all features
- [ ] Update `README.md` with:
  - [ ] Analytics setup instructions
  - [ ] SEO documentation
  - [ ] Environment variables list
- [ ] Create deployment checklist
- [ ] Document rollback procedure
- [ ] Create PR with all changes
- [ ] Get team approval
- [ ] Deploy to staging
- [ ] Smoke test on staging
- [ ] Verify analytics on staging
- [ ] Schedule production deployment

**Week 4 Success Criteria:**
- ✅ All tests passing
- ✅ Sitemap submitted to search engines
- ✅ SEO score 90+
- ✅ Page speed 85+ (desktop)
- ✅ Analytics verified end-to-end
- ✅ Ready for production

---

## 📊 Final Checklist (Before Production Deploy)

### Code Quality
- [ ] All files documented (80%+ coverage)
- [ ] No magic numbers
- [ ] No `any` types in critical code
- [ ] No commented-out code
- [ ] All tests passing
- [ ] TypeScript builds without errors
- [ ] No console errors in browser

### Analytics
- [ ] GA4 property configured
- [ ] Conversion goals set up
- [ ] Custom events tested
- [ ] Realtime tracking verified
- [ ] Funnel reports accessible
- [ ] Team has GA4 dashboard access

### SEO
- [ ] All pages have meta tags
- [ ] Structured data validated
- [ ] Sitemap submitted to Google
- [ ] Sitemap submitted to Bing
- [ ] Robots.txt configured
- [ ] Images optimized
- [ ] Alt text on all images
- [ ] Internal linking implemented
- [ ] Canonical URLs set
- [ ] Open Graph working
- [ ] Lighthouse score 90+

### Performance
- [ ] Page speed 85+ (desktop)
- [ ] Page speed 70+ (mobile)
- [ ] Core Web Vitals passing
- [ ] Images lazy loaded
- [ ] Code split by route
- [ ] No render-blocking resources

### Documentation
- [ ] README updated
- [ ] CHANGELOG updated
- [ ] Analytics guide created
- [ ] SEO playbook created
- [ ] Deployment guide created

### Production Readiness
- [ ] Environment variables set
- [ ] SSL certificate active
- [ ] Domain configured
- [ ] Backup strategy in place
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Team trained on new features

---

## 🎯 Post-Launch (Week 5+)

### Immediate (Day 1-7)
- [ ] Monitor analytics for errors
- [ ] Check conversion tracking
- [ ] Review user behavior flow
- [ ] Fix any critical issues
- [ ] Respond to user feedback

### Short-term (Week 2-4)
- [ ] Review GA4 reports weekly
- [ ] Analyze funnel drop-off points
- [ ] Optimize based on data
- [ ] A/B test booking flow variations
- [ ] Monitor search console for errors

### Long-term (Month 2+)
- [ ] Monthly SEO audit
- [ ] Quarterly Lighthouse audit
- [ ] Content strategy (blog posts)
- [ ] Link building outreach
- [ ] Customer review collection
- [ ] Continuous optimization

---

**Track your progress with this checklist!**  
Mark items as complete with `[x]` as you go.

**Need help?** Refer back to `CODE_IMPROVEMENT_PLAN.md` for detailed implementation guides.

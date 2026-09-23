---
title: Privacy
description: What this documentation site collects, what it does not, and how analytics are handled.
ogSection: Project
surroundOrder: 22
---

This site is a documentation website. It has no accounts, no login, no database of visitors, and it does not ask for or process personal data directly.

## What Is Collected

The site uses Vercel Analytics to count page views. Vercel Analytics is cookieless and does not use persistent identifiers that could single out an individual visitor: it records aggregates such as page path, referrer, country, and device class, without building user profiles.

Web server infrastructure (Vercel and its CDN) processes standard request metadata such as IP address, user agent, and requested URL for the technical purposes of serving content, security, and abuse prevention, as described in Vercel's own privacy documentation. The site's operators do not run additional logging or analytics beyond Vercel Analytics.

## What Is Not Collected

- No cookies are set by this site for tracking purposes.
- No forms: this site has no comment forms, newsletter signups, or data-entry fields, so nothing you type is stored here.
- No advertising, no cross-site trackers, and no fingerprinting scripts.
- No sale or sharing of visitor data with data brokers.

## Third-Party Content

Documentation pages embed code examples but do not load third-party advertising or social widgets. External links (GitHub, npm, the demo page) are governed by the privacy policies of those destinations.

## Machine Agents

Automated agents and crawlers are welcome within the rate-limit conventions documented in `/openapi.json`. Agent traffic is treated the same as any other request metadata: it may appear in aggregate analytics, and it is not correlated with any individual.

## Changes

If data collection practices change, this page will be updated before those changes take effect. The current page is the authoritative description of the site's privacy posture.

For privacy questions, see the [Contact](/contact) page.

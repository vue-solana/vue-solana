---
title: Datenschutz
description: Was diese Dokumentationsseite erfasst, was nicht, und wie Analytics gehandhabt werden.
ogSection: Projekt
surroundOrder: 24
---

Diese Seite ist eine Dokumentationswebsite. Sie hat keine Konten, kein Login, keine Besucherdatenbank und fragt keine personenbezogenen Daten ab oder verarbeitet sie direkt.

## Was erfasst wird

Die Seite verwendet Vercel Analytics, um Seitenaufrufe zu zählen. Vercel Analytics ist cookielos und nutzt keine persistenten Identifikatoren, die eine einzelne Person erkennen könnten: Es werden Aggregate wie Seitenpfad, Referrer, Land und Gerätekategorie erfasst, ohne Nutzerprofile zu erstellen.

Die Web-Server-Infrastruktur (Vercel und sein CDN) verarbeitet übliche Request-Metadaten wie IP-Adresse, User-Agent und angeforderte URL zu technischen Zwecken — der Auslieferung von Inhalten, der Sicherheit und der Missbrauchsprävention —, wie in der Datenschutzdokumentation von Vercel beschrieben. Die Betreiber der Seite führen über Vercel Analytics hinaus keine zusätzlichen Logs oder Analysen.

## Was nicht erfasst wird

- Diese Seite setzt keine Cookies zu Tracking-Zwecken.
- Keine Formulare: Diese Seite hat keine Kommentarformulare, Newsletter-Anmeldungen oder Dateneingabefelder, daher wird nichts, was du eingibst, hier gespeichert.
- Keine Werbung, keine siteübergreifenden Tracker und keine Fingerprinting-Skripte.
- Kein Verkauf und keine Weitergabe von Besucherdaten an Datenhändler.

## Inhalte von Drittanbietern

Dokumentationsseiten betten Codebeispiele ein, laden aber keine Werbung oder Social-Widgets von Drittanbietern. Für externe Links (GitHub, npm, die Demo-Seite) gelten die Datenschutzrichtlinien der jeweiligen Ziele.

## Maschinelle Agenten

Automatisierte Agenten und Crawler sind willkommen, solange sie die in `/openapi.json` dokumentierten Rate-Limit-Konventionen einhalten. Agenten-Traffic wird wie jede andere Request-Metadaten behandelt: Er kann in aggregierten Analysen erscheinen und wird nicht mit einer einzelnen Person verknüpft.

## Änderungen

Wenn sich die Datenerfassungspraktiken ändern, wird diese Seite aktualisiert, bevor die Änderungen wirksam werden. Die aktuelle Seite ist die maßgebliche Beschreibung der Datenschutzhaltung dieser Website.

Bei Datenschutzfragen siehe die Seite [Kontakt](/de/contact).

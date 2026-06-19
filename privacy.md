---
layout: page
title: Privacy Policy
permalink: /privacy/
updated: true
description: "How Vive handles your data — local-first, no account, never sold."
---

## Who we are

Vive ("we", "us") is operated by {{ site.company.legal_entity }}, contactable at
{% include email.html %}.

## The short version

- Your profile, meal log, and weight data are stored **on your device**, not on
  our servers.
- Your Apple Health data is read **on your device** to calculate insights. It is
  not sold or shared. Only the **aggregate** figures used to write your optional
  weekly digest (e.g. average sleep hours, total Zone 2 minutes) are sent for AI
  summarisation — never your individual Health records.
- When you scan or compare a food, the photo or text you submit, plus a short
  summary of your profile, is sent to our processing service to generate a
  result. It is not used for advertising and not sold.

## Apple Health (HealthKit) data

With your permission, Vive reads heart rate, resting heart rate, heart rate
variability, sleep, and workout data from Apple Health to show wellness trends
and estimate Zone 2 minutes.

- Individual Health records are processed **on your device** and are **never**
  transmitted to us or to third parties.
- If you generate the optional weekly **digest**, aggregate figures derived from
  this data (for example your average sleep for the week and total Zone 2
  minutes) are included in the text sent to our AI provider (Anthropic) to write
  the summary. No individual Health records are sent.
- We never use HealthKit data for advertising or marketing, and never sell it or
  share it with data brokers.
- You can revoke access any time in iOS Settings → Privacy & Security → Health.

This use complies with Apple's HealthKit requirements.

## Food scans and comparisons

To analyse a food, label, menu, or comparison, the **image or text you provide**
is sent to our backend, which forwards it to our AI analysis provider
(**Anthropic**, via the Claude API) to produce a result returned to your device.
A condensed summary of your profile (diet, conditions, allergies, goals, age) is
included so the verdict can be personalised. We do not attach your name or device
identifiers to these requests, do not use this content to train models, and do
not sell it.

## What we store on your device

Your dietary profile, free-text health notes, consent acknowledgement, meal
history, and weight log are stored locally using on-device storage. Use
**Settings → Clear all data** to erase them, or delete the app to remove
everything.

## What we do not collect

We do not require an account. We do not collect your name, email, contacts,
location, or advertising identifiers. We do not use third-party analytics or
advertising SDKs.

## Children

Vive is not directed to children under 13. Do not use it if you are under that
age.

## Your choices

- Revoke Health, Camera, or Photo access in iOS Settings at any time.
- Clear your data in-app (Settings → Clear all data).
- Delete the app to remove all on-device data.
- Contact {% include email.html %} with any privacy request.

## Security

Data sent to our processing service travels over encrypted connections (HTTPS).
No method of transmission or storage is perfectly secure.

## Medical disclaimer

Vive provides general nutrition and wellness information only, generated in part
by AI which can be wrong. It is not a medical device and does not provide medical
advice, diagnosis, or treatment. See the in-app disclaimers and Terms.

## Changes

We will update this page and the "Last updated" date when this policy changes.

## Contact

{% include email.html %} · {{ site.company.legal_entity }}

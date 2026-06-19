# viveweb

The public marketing site for **Vive**, plus the hosted **Privacy Policy** and
**Terms of Use**. Built with [Jekyll](https://jekyllrb.com/) and served by
GitHub Pages at <https://archietownsend.github.io/viveweb>.

## Structure

```
_config.yml              site config (contact, legal, URLs)
index.html               marketing landing page
privacy.md               → /privacy/
terms.md                 → /terms/
_layouts/                default (chrome) + page (legal prose)
assets/css/style.css     dark sage theme matching the app
assets/img/              icon + App Store screenshots (from the vive repo)
```

## Enable GitHub Pages

Repo **Settings → Pages → Build and deployment**:

- **Source:** Deploy from a branch
- **Branch:** `main`, folder **`/` (root)**

GitHub builds the Jekyll site automatically and publishes to
<https://archietownsend.github.io/viveweb>.

> If you move to a custom domain, update `url`/`baseurl` in `_config.yml`
> (set `baseurl` to `""` for a root domain).

## Local preview

```bash
bundle install
bundle exec jekyll serve   # http://localhost:4000/viveweb/
```

## Editing

- Contact, legal entity, jurisdiction, App Store link, and the policy date all
  live in `_config.yml` and flow into the pages.
- Screenshots come from the framed App Store set in the `vive` repo
  (`appstore/framed/6.7`); re-copy into `assets/img/screens/` to refresh.

> The policies are adapted templates, not legal advice — have a lawyer review
> them before relying on them.

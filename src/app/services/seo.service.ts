import { Injectable } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  schema?: object;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly BASE_URL = 'https://mmrconstructions.in';
  private readonly DEFAULT_IMAGE = `${this.BASE_URL}/assets/mmr-og-image.jpg`;
  private canonicalTrackingStarted = false;

  constructor(private title: Title, private meta: Meta, private router: Router) { }

  set(config: SeoConfig) {
    const canonical = this.toCanonicalUrl(config.canonical || this.router.url);
    const ogImage = config.ogImage || this.DEFAULT_IMAGE;

    this.title.setTitle(config.title);

    // Standard meta
    this.updateTag('description', config.description);
    this.updateTag('keywords', config.keywords || '');
    this.updateTag('robots', 'index, follow');

    // Open Graph
    this.updateProperty('og:title', config.title);
    this.updateProperty('og:description', config.description);
    this.updateProperty('og:url', canonical);
    this.updateProperty('og:image', ogImage);
    this.updateProperty('og:type', 'website');
    this.updateProperty('og:site_name', 'MMR Constructions & Developers');
    this.updateProperty('og:locale', 'hi_IN');

    // Twitter
    this.updateTag('twitter:card', 'summary_large_image');
    this.updateTag('twitter:title', config.title);
    this.updateTag('twitter:description', config.description);
    this.updateTag('twitter:image', ogImage);

    // Canonical
    this.setCanonical(canonical);

    // JSON-LD Schema
    if (config.schema) {
      this.setSchema(config.schema, 'dynamic-schema');
    }
  }

  startCanonicalTracking() {
    if (this.canonicalTrackingStarted) return;
    this.canonicalTrackingStarted = true;

    this.updateCanonicalForRoute(this.router.url);
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => this.updateCanonicalForRoute(event.urlAfterRedirects));
  }

  private updateTag(name: string, content: string) {
    this.meta.updateTag({ name, content });
  }

  private updateProperty(property: string, content: string) {
    this.meta.updateTag({ property, content });
  }

  private updateCanonicalForRoute(routeUrl: string) {
    const canonical = this.toCanonicalUrl(routeUrl);
    this.setCanonical(canonical);
    this.updateProperty('og:url', canonical);
  }

  private toCanonicalUrl(url: string) {
    let path = url || '/';

    try {
      if (/^https?:\/\//i.test(path)) {
        path = new URL(path).pathname;
      }
    } catch {
      path = '/';
    }

    path = path.split('?')[0].split('#')[0] || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    if (path.length > 1) path = path.replace(/\/+$/, '');

    return `${this.BASE_URL}${path === '/' ? '/' : path}`;
  }

  private setCanonical(url: string) {
    const links = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'));
    let link = links.shift();

    links.forEach((duplicate) => duplicate.remove());

    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    if (!link) {
      return;
    }
    link.setAttribute('href', url);
  }

  setSchema(schema: object, id = 'dynamic-schema') {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('script');
      el.id = id;
      el.setAttribute('type', 'application/ld+json');
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(schema);
  }

  setBreadcrumb(items: { name: string; url: string }[]) {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': items.map((item, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'name': item.name,
        'item': `${this.BASE_URL}${item.url}`
      }))
    };
    this.setSchema(schema, 'breadcrumb-schema');
  }
}

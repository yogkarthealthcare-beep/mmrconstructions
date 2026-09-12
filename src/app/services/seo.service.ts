import { Injectable, Inject, PLATFORM_ID, RendererFactory2, Renderer2 } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

export interface SeoConfig {
  title: string;
  description: string;
  keywords?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: string;
  schema?: object;
}

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly BASE_URL = 'https://mmrconstructions.in';
  private readonly DEFAULT_IMAGE = `${this.BASE_URL}/assets/mmr-logo.png`;
  private canonicalTrackingStarted = false;
  private renderer: Renderer2;

  constructor(
    private title: Title,
    private meta: Meta,
    private router: Router,
    @Inject(DOCUMENT) private doc: Document,
    @Inject(PLATFORM_ID) private platformId: object,
    rendererFactory: RendererFactory2
  ) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  set(config: SeoConfig) {
    const canonical = this.toCanonicalUrl(config.canonical || this.router.url);
    const ogImage = config.ogImage || this.DEFAULT_IMAGE;

    // Document Title
    this.title.setTitle(config.title);

    // Standard Meta Tags
    this.updateTag('description', config.description);
    this.updateTag('keywords', config.keywords || 'MMR constructions, plots in kanpur, plots in unnao, plots in lucknow, real estate developers uttar pradesh');
    this.updateTag('robots', 'index, follow');

    // Open Graph
    this.updateProperty('og:title', config.title);
    this.updateProperty('og:description', config.description);
    this.updateProperty('og:url', canonical);
    this.updateProperty('og:image', ogImage);
    this.updateProperty('og:type', config.ogType || 'website');
    this.updateProperty('og:site_name', 'MMR Constructions & Developers');
    this.updateProperty('og:locale', 'hi_IN');

    // Twitter Cards
    this.updateTag('twitter:card', 'summary_large_image');
    this.updateTag('twitter:title', config.title);
    this.updateTag('twitter:description', config.description);
    this.updateTag('twitter:image', ogImage);

    // SSR-Safe Canonical
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
    let link: HTMLLinkElement | null = this.doc.querySelector('link[rel="canonical"]');
    if (!link) {
      link = this.renderer.createElement('link');
      this.renderer.setAttribute(link, 'rel', 'canonical');
      this.renderer.appendChild(this.doc.head, link);
    }
    this.renderer.setAttribute(link, 'href', url);
  }

  setSchema(schema: object, id = 'dynamic-schema') {
    let el: HTMLScriptElement | null = this.doc.getElementById(id) as HTMLScriptElement;
    if (!el) {
      el = this.renderer.createElement('script');
      this.renderer.setAttribute(el, 'id', id);
      this.renderer.setAttribute(el, 'type', 'application/ld+json');
      this.renderer.appendChild(this.doc.head, el);
    }
    this.renderer.setProperty(el, 'textContent', JSON.stringify(schema));
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

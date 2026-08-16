import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { BlogService } from '../../blog/blog.service';
import { BlogPost } from '../../blog/blog.types';
import { SeoService } from '../../services/seo.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, TranslatePipe],
  templateUrl: './blog-detail.component.html',
  styleUrl: './blog-detail.component.css',
})
export class BlogDetailComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly blogService = inject(BlogService);
  private readonly seo = inject(SeoService);
  readonly language = inject(LanguageService);
  private routeSubscription?: Subscription;
  private slug = '';

  get post(): BlogPost | undefined {
    return this.blogService.getBySlug(this.slug);
  }

  get relatedPosts(): readonly BlogPost[] {
    return this.post ? this.blogService.getRelated(this.post) : [];
  }

  constructor() {
    effect(() => {
      this.language.current();
      if (this.slug) this.updateSeo();
    });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.paramMap.subscribe((params) => {
      this.slug = params.get('slug') ?? '';
      if (!this.post) {
        this.router.navigateByUrl('/', { replaceUrl: true });
        return;
      }
      this.updateSeo();
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  }

  formatDate(value: string, short = false): string {
    return new Intl.DateTimeFormat(this.language.current() === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit', month: short ? 'short' : 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
  }

  private updateSeo(): void {
    if (!this.post) {
      this.seo.set({
        title: 'Blog Not Found | MMR Constructions',
        description: 'The requested MMR Constructions blog article could not be found.',
        canonical: 'https://mmrconstructions.in/blog',
      });
      return;
    }

    const canonical = `https://mmrconstructions.in/blog/${this.post.slug}`;
    this.seo.set({
      title: this.post.metaTitle,
      description: this.post.metaDescription,
      keywords: this.post.keywords,
      canonical,
    });

    this.seo.setSchema(
      {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: this.post.title,
        description: this.post.shortDescription,
        image: `https://mmrconstructions.in${this.post.featuredImage}`,
        datePublished: this.post.publishDate,
        dateModified: this.post.publishDate,
        author: {
          '@type': 'Organization',
          name: this.post.author,
        },
        publisher: {
          '@type': 'Organization',
          name: 'MMR Constructions and Developers Private Limited',
          url: 'https://mmrconstructions.in',
        },
        mainEntityOfPage: canonical,
      },
      'blog-post-schema',
    );
  }
}

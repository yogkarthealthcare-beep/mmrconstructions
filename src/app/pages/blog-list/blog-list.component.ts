import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogService } from '../../blog/blog.service';
import { SeoService } from '../../services/seo.service';
import { FooterComponent } from '../../shared/footer/footer.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, TranslatePipe],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.css',
})
export class BlogListComponent implements OnInit {
  private readonly blogService = inject(BlogService);
  private readonly seo = inject(SeoService);
  readonly language = inject(LanguageService);

  get posts() {
    return this.blogService.getAll();
  }

  formatDate(value: string): string {
    return new Intl.DateTimeFormat(this.language.current() === 'hi' ? 'hi-IN' : 'en-IN', {
      day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  }

  ngOnInit(): void {
    this.seo.set({
      title: 'Blogs | Property Insights by MMR Constructions',
      description:
        'Read practical property insights for Unnao, Kanpur, Lucknow, Kannauj and Raebareli from MMR Constructions.',
      keywords:
        'property blogs, property in Unnao, Kanpur property, Lucknow property, Kannauj property, Raebareli property',
      canonical: 'https://mmrconstructions.in/blog',
    });
  }
}

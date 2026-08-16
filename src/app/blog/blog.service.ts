import { Injectable } from '@angular/core';
import { BLOG_POSTS } from './blog.data';
import { BLOG_POSTS_HI } from './blog.data.hi';
import { BlogPost } from './blog.types';
import { LanguageService } from '../services/language.service';

@Injectable({ providedIn: 'root' })
export class BlogService {
  constructor(private language: LanguageService) {}

  getAll(): readonly BlogPost[] {
    return this.language.current() === 'hi' ? BLOG_POSTS_HI : BLOG_POSTS;
  }

  getBySlug(slug: string): BlogPost | undefined {
    return this.getAll().find((post) => post.slug === slug);
  }

  getRelated(post: BlogPost, limit = 3): readonly BlogPost[] {
    return this.getAll().filter((candidate) => candidate.id !== post.id).slice(0, limit);
  }
}

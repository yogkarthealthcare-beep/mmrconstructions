import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

export interface UnlinkedPlotTool {
  id: string;
  title: string;
  hindiTitle: string;
  category: 'sites' | 'ai_mapping' | 'leads_media' | 'applications';
  categoryLabel: string;
  route: string;
  queryParams?: Record<string, any>;
  icon: string;
  iconBg: string;
  badge: string;
  badgeClass: string;
  description: string;
  features: string[];
  workflowStep: string;
  isPopular?: boolean;
}

@Component({
  selector: 'app-plot-booking-process',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './plot-booking-process.component.html',
  styleUrls: ['./plot-booking-process.component.css']
})
export class PlotBookingProcessComponent implements OnInit {
  searchTerm = '';
  selectedCategory: string = 'all';

  tools: UnlinkedPlotTool[] = [
    {
      id: 'sites-mgmt',
      title: 'Site Master & Plot Layouts',
      hindiTitle: 'साइट्स मास्टर एवं लेआउट प्रबंधन',
      category: 'sites',
      categoryLabel: 'Site & Sector Master',
      route: '/admin/sites',
      icon: 'fas fa-city',
      iconBg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
      badge: 'SITE MASTER',
      badgeClass: 'badge-emerald',
      description: 'Master list of real estate project sites, sector blocks, phase specifications, total plot units, and layout image attachments.',
      features: ['Add & Edit Project Sites', 'Plot Inventory Counters', 'Site Specifications & Phases', 'Layout Blueprint Attachments'],
      workflowStep: 'Step 1: Master Setup'
    },
    {
      id: 'new-site-area',
      title: 'New Site Area & Sector Planning',
      hindiTitle: 'नया साइट एरिया एवं सेक्टर प्लानर',
      category: 'sites',
      categoryLabel: 'Site & Sector Master',
      route: '/admin/new-site-area',
      icon: 'fas fa-draw-polygon',
      iconBg: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
      badge: 'SECTOR PLANNER',
      badgeClass: 'badge-teal',
      description: 'Wizard tool to define and register new project sector boundaries, dimensional boundaries, plot block subdivisions, and square footage.',
      features: ['Sector Boundary Creation', 'Sub-plot Block Subdivision', 'Coordinate Calibration', 'Area Sq.Ft. Calculations'],
      workflowStep: 'Step 1: Master Setup'
    },
    {
      id: 'plot-map-editor',
      title: 'Interactive Visual Plot Map Editor',
      hindiTitle: 'इंटरैक्टिव विजुअल प्लॉट मैप एडिटर',
      category: 'ai_mapping',
      categoryLabel: 'AI & Map Editors',
      route: '/admin/plot-map-editor',
      icon: 'fas fa-vector-square',
      iconBg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
      badge: 'CANVAS EDITOR',
      badgeClass: 'badge-amber',
      description: 'Interactive SVG canvas to draw, click, configure, and manage live plot coordinates, numbers, sizes, pricing, and availability status (Available, Hold, Booked, Registry).',
      features: ['Visual Grid & Polygon Overlay', 'Live Plot Status Toggle', 'Dimension & Facing Editor', 'Instant Site Synchronization'],
      workflowStep: 'Step 2: Plot Canvas Mapping',
      isPopular: true
    },
    {
      id: 'plot-detector-tool',
      title: 'AI Plot Map Scanner & OCR Detector (v1)',
      hindiTitle: 'AI प्लॉट डिटेक्टर एवं OCR स्कैनर (v1)',
      category: 'ai_mapping',
      categoryLabel: 'AI & Map Editors',
      route: '/admin/plot-detector-tool',
      icon: 'fas fa-robot',
      iconBg: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
      badge: 'AI OCR ENGINE',
      badgeClass: 'badge-indigo',
      description: 'Automated AI layout blueprint scanner that reads image blueprints, uses OCR to detect plot numbers, draws bounding boxes, and auto-generates digital plot records.',
      features: ['Blueprint Image Upload', 'Automated OCR Plot Detection', 'Bounding Box Auto-Cropping', 'Batch Plot Export to Database'],
      workflowStep: 'Step 2: Digitization Tool'
    },
    {
      id: 'plot-detector-2',
      title: 'Advanced Polygon Map Detector (v2.0)',
      hindiTitle: 'एडवांस्ड पॉलीगॉन मैप डिटेक्टर (v2.0)',
      category: 'ai_mapping',
      categoryLabel: 'AI & Map Editors',
      route: '/admin/plot-detector-2',
      icon: 'fas fa-shapes',
      iconBg: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
      badge: 'VECTOR POLYGON 2.0',
      badgeClass: 'badge-purple',
      description: 'Second-generation vector polygon boundary detector supporting non-rectangular plots, curved road curves, corner plots, and customized polygon node points.',
      features: ['Multi-vertex Polygon Mapping', 'Irregular Corner Plot Detection', 'Curved Road Alignment', 'High-precision SVG Export'],
      workflowStep: 'Step 2: Digitization Tool'
    },
    {
      id: 'book-plot-leads',
      title: 'Book Plot Leads & Web Inquiries',
      hindiTitle: 'ऑनलाइन प्लॉट बुकिंग लीड्स एवं पूछताछ',
      category: 'leads_media',
      categoryLabel: 'Leads & Media',
      route: '/admin/book-plot-leads',
      icon: 'fas fa-clipboard-check',
      iconBg: 'linear-gradient(135deg, #ea580c 0%, #f97316 100%)',
      badge: 'DIRECT LEADS',
      badgeClass: 'badge-orange',
      description: 'Capture and manage customer plot booking inquiries submitted through the website book plot interface, preferred plot numbers, and buyer contact leads.',
      features: ['Direct Online Booking Leads', 'Preferred Plot & Size Requests', 'Customer Follow-up Status', 'Conversion to Active Booking'],
      workflowStep: 'Step 3: Inquiries & Leads'
    },
    {
      id: 'site-gallery-plot',
      title: 'Site Gallery — Plot Category Media',
      hindiTitle: 'साइट गैलरी — प्लॉट श्रेणी मीडिया',
      category: 'leads_media',
      categoryLabel: 'Leads & Media',
      route: '/admin/site-gallery/plot',
      icon: 'fas fa-photo-video',
      iconBg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
      badge: 'MEDIA SHOWCASE',
      badgeClass: 'badge-blue',
      description: 'Dedicated plot gallery showcase manager for uploading ground progress photographs, drone layout videos, demarcation pegs, and road development media.',
      features: ['Plot Ground HD Photos', 'Drone Layout Fly-through Videos', 'Development Progress Tags', 'Customer Media Showcase'],
      workflowStep: 'Step 3: Media & Showcase'
    },
    {
      id: 'customer-applications',
      title: 'Customer Plot Applications & Admissions',
      hindiTitle: 'कस्टमर प्लॉट आवेदन एवं एडमिशन फॉर्म',
      category: 'applications',
      categoryLabel: 'Customer Applications',
      route: '/admin/customer-applications',
      icon: 'fas fa-file-signature',
      iconBg: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
      badge: 'ADMISSION FORMS',
      badgeClass: 'badge-sky',
      description: 'Directory of complete customer plot admission applications, KYC verification documents, applicant and co-applicant details, and offline admission forms.',
      features: ['Full Admission Application Records', 'Applicant & Co-Applicant KYC', 'Property Value & Payment Track', 'Application Status Approval'],
      workflowStep: 'Step 4: Customer Admission'
    }
  ];

  ngOnInit(): void {}

  get filteredTools(): UnlinkedPlotTool[] {
    let list = this.tools;
    if (this.selectedCategory !== 'all') {
      list = list.filter(t => t.category === this.selectedCategory);
    }
    if (this.searchTerm && this.searchTerm.trim()) {
      const q = this.searchTerm.toLowerCase().trim();
      list = list.filter(t => 
        t.title.toLowerCase().includes(q) ||
        t.hindiTitle.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.route.toLowerCase().includes(q) ||
        t.badge.toLowerCase().includes(q) ||
        t.features.some(f => f.toLowerCase().includes(q))
      );
    }
    return list;
  }

  getCategoryCount(cat: string): number {
    if (cat === 'all') return this.tools.length;
    return this.tools.filter(t => t.category === cat).length;
  }
}

import { CommonModule } from '@angular/common';
import { Component, OnInit, effect } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FooterComponent } from '../../shared/footer/footer.component';
import { NavbarComponent } from '../../shared/navbar/navbar.component';
import { SeoService } from '../../services/seo.service';
import { LanguageService } from '../../services/language.service';
import { TranslatePipe } from '../../shared/pipes/translate.pipe';

type LegalSection = { title: string; paragraphs: string[] };

const TERMS_SECTIONS: LegalSection[] = [
  {
    title: 'Website Use and Information',
    paragraphs: [
      'This website provides general information about MMR Constructions & Developers Private Limited, its projects, services, payment options and customer programmes. Website content is intended for preliminary information and should not replace the final written agreement, allotment letter, sale documentation or other documents signed for a specific transaction.',
      'Visitors must use the website lawfully and must not attempt to disrupt, misuse, copy, reverse engineer or gain unauthorised access to the website, customer accounts, admin systems or connected services.',
    ],
  },
  {
    title: 'Property Information and Availability',
    paragraphs: [
      'Plot availability, prices, dimensions, payment schedules, amenities and project information may change. A plot is treated as finally booked only after required verification, payment confirmation and completion of the applicable company process.',
      'Maps, photographs, illustrations and measurements are provided for guidance. Customers should independently inspect the property and review the applicable title, approval and transaction documents before making a purchase decision.',
    ],
  },
  {
    title: 'Registration, KYC and Account Security',
    paragraphs: [
      'Customers and associates must provide accurate information. Email verification, identity verification and KYC approval may be required before access to booking, payment, commission or other protected facilities is granted.',
      'Users are responsible for maintaining the confidentiality of their login credentials and for promptly reporting suspected unauthorised account activity.',
    ],
  },
  {
    title: 'Bookings, Payments and Cancellations',
    paragraphs: [
      'Booking amounts, EMI values, payment methods, appointment slots, cancellation rules and refund eligibility are governed by the applicable booking documents and policies shown or supplied during the transaction.',
      'Online payments are processed through authorised payment gateways. A payment is considered successful only after confirmation from the gateway and verification by the company system.',
    ],
  },
  {
    title: 'Intellectual Property and Liability',
    paragraphs: [
      'Website text, branding, graphics, layouts and software are owned by or licensed to MMR Constructions. They may not be commercially reused without written permission.',
      'The company takes reasonable steps to keep information and services available, but does not guarantee uninterrupted access or freedom from all technical errors. Liability remains subject to applicable law and the governing transaction documents.',
    ],
  },
  {
    title: 'Changes and Governing Terms',
    paragraphs: [
      'These Terms & Conditions may be updated when services, legal requirements or business processes change. The version published on this page is the current website version.',
      'Any property transaction remains governed by its signed documents and applicable laws in India. Questions may be sent through the Contact section of this website.',
    ],
  },
];

const PRIVACY_SECTIONS: LegalSection[] = [
  {
    title: 'Information We Collect',
    paragraphs: [
      'We may collect information provided during enquiries, registration, KYC, bookings, payments and support requests, including name, email address, mobile number, postal address, identity documents, payment references and uploaded files.',
      'We may also collect limited technical information such as browser type, device information, IP address, pages visited and diagnostic logs needed to operate and secure the website.',
    ],
  },
  {
    title: 'How Information Is Used',
    paragraphs: [
      'Information is used to verify accounts, process property enquiries and bookings, manage payments and EMI schedules, review KYC documents, communicate service updates, prevent fraud and provide customer support.',
      'We do not sell personal information. Information may be shared with authorised service providers when required for payment processing, hosting, communication, document storage, legal compliance or delivery of requested services.',
    ],
  },
  {
    title: 'Document and Payment Security',
    paragraphs: [
      'Uploaded identity and transaction documents are restricted to authorised workflows and personnel. Payment card or UPI processing is handled by the selected payment gateway under its own security and privacy practices.',
      'Reasonable administrative and technical safeguards are used, but no internet transmission or storage system can be guaranteed to be completely secure.',
    ],
  },
  {
    title: 'Cookies and Website Analytics',
    paragraphs: [
      'The website may use essential browser storage, cookies or similar technologies for login sessions, preferences, security and performance. Third-party services may set their own cookies where enabled.',
    ],
  },
  {
    title: 'Retention and Your Choices',
    paragraphs: [
      'Information is retained only for as long as needed for the purposes described here, contractual obligations, dispute handling and legal or accounting requirements.',
      'Subject to applicable law, users may request correction of inaccurate profile information or ask questions about their information through the company contact channels.',
    ],
  },
  {
    title: 'Policy Updates and Contact',
    paragraphs: [
      'This Privacy Policy may be updated to reflect changes in technology, services or legal requirements. Material changes will be reflected on this page.',
      'For privacy questions, contact MMR Constructions through the phone, email or office details published on the website.',
    ],
  },
];

const TERMS_SECTIONS_HI: LegalSection[] = [
  {
    title: 'वेबसाइट का उपयोग और जानकारी',
    paragraphs: [
      'यह वेबसाइट MMR Constructions & Developers Private Limited, उसकी परियोजनाओं, सेवाओं, भुगतान विकल्पों और ग्राहक कार्यक्रमों की सामान्य जानकारी देती है। यह प्रारंभिक जानकारी है और किसी विशेष लेन-देन के अंतिम लिखित समझौते, आवंटन पत्र, बिक्री दस्तावेज़ या हस्ताक्षरित दस्तावेज़ों का स्थान नहीं लेती।',
      'वेबसाइट का उपयोग कानूनी रूप से किया जाना चाहिए। वेबसाइट, ग्राहक खातों, एडमिन सिस्टम या जुड़ी सेवाओं को बाधित करने, दुरुपयोग करने, कॉपी करने, रिवर्स इंजीनियर करने या अनधिकृत पहुँच पाने का प्रयास नहीं किया जाना चाहिए।',
    ],
  },
  {
    title: 'संपत्ति की जानकारी और उपलब्धता',
    paragraphs: [
      'प्लॉट की उपलब्धता, कीमत, माप, भुगतान कार्यक्रम, सुविधाएँ और परियोजना जानकारी बदल सकती हैं। आवश्यक सत्यापन, भुगतान पुष्टि और कंपनी की लागू प्रक्रिया पूरी होने के बाद ही प्लॉट अंतिम रूप से बुक माना जाएगा।',
      'मानचित्र, फोटो, चित्र और माप मार्गदर्शन के लिए हैं। खरीद का निर्णय लेने से पहले ग्राहक को संपत्ति का स्वतंत्र निरीक्षण और संबंधित स्वामित्व, अनुमति तथा लेन-देन दस्तावेज़ों की जाँच करनी चाहिए।',
    ],
  },
  {
    title: 'पंजीकरण, केवाईसी और खाते की सुरक्षा',
    paragraphs: [
      'ग्राहकों और एसोसिएट्स को सही जानकारी देनी होगी। बुकिंग, भुगतान, कमीशन या अन्य सुरक्षित सुविधाओं तक पहुँच से पहले ईमेल, पहचान और केवाईसी सत्यापन आवश्यक हो सकता है।',
      'लॉगिन विवरण गोपनीय रखना और किसी संदिग्ध अनधिकृत गतिविधि की तुरंत सूचना देना उपयोगकर्ता की जिम्मेदारी है।',
    ],
  },
  {
    title: 'बुकिंग, भुगतान और रद्दीकरण',
    paragraphs: [
      'बुकिंग राशि, ईएमआई, भुगतान विधि, अपॉइंटमेंट, रद्दीकरण और रिफंड की पात्रता संबंधित बुकिंग दस्तावेज़ों तथा लेन-देन के समय दिखाई या दी गई नीतियों से नियंत्रित होगी।',
      'ऑनलाइन भुगतान अधिकृत पेमेंट गेटवे से संसाधित होते हैं। गेटवे की पुष्टि और कंपनी सिस्टम के सत्यापन के बाद ही भुगतान सफल माना जाएगा।',
    ],
  },
  {
    title: 'बौद्धिक संपदा और उत्तरदायित्व',
    paragraphs: [
      'वेबसाइट का पाठ, ब्रांडिंग, ग्राफिक्स, लेआउट और सॉफ्टवेयर MMR Constructions के स्वामित्व या लाइसेंस में हैं। लिखित अनुमति के बिना उनका व्यावसायिक पुनः उपयोग नहीं किया जा सकता।',
      'कंपनी जानकारी और सेवाएँ उपलब्ध रखने के उचित प्रयास करती है, लेकिन निर्बाध पहुँच या सभी तकनीकी त्रुटियों से पूर्ण मुक्ति की गारंटी नहीं देती। उत्तरदायित्व लागू कानून और लेन-देन दस्तावेज़ों के अधीन रहेगा।',
    ],
  },
  {
    title: 'परिवर्तन और लागू शर्तें',
    paragraphs: [
      'सेवाओं, कानूनी आवश्यकताओं या व्यावसायिक प्रक्रियाओं में बदलाव होने पर इन नियमों और शर्तों को अपडेट किया जा सकता है। इस पेज पर प्रकाशित संस्करण वर्तमान वेबसाइट संस्करण है।',
      'हर संपत्ति लेन-देन उसके हस्ताक्षरित दस्तावेज़ों और भारत के लागू कानूनों से नियंत्रित होगा। प्रश्न वेबसाइट के संपर्क अनुभाग से भेजे जा सकते हैं।',
    ],
  },
];

const PRIVACY_SECTIONS_HI: LegalSection[] = [
  {
    title: 'हम कौन-सी जानकारी एकत्र करते हैं',
    paragraphs: [
      'हम पूछताछ, पंजीकरण, केवाईसी, बुकिंग, भुगतान और सहायता अनुरोधों के दौरान दी गई जानकारी एकत्र कर सकते हैं, जिसमें नाम, ईमेल, मोबाइल नंबर, पता, पहचान दस्तावेज़, भुगतान संदर्भ और अपलोड की गई फाइलें शामिल हैं।',
      'वेबसाइट चलाने और सुरक्षित रखने के लिए ब्राउज़र प्रकार, डिवाइस जानकारी, आईपी पता, देखे गए पेज और सीमित तकनीकी लॉग भी एकत्र किए जा सकते हैं।',
    ],
  },
  {
    title: 'जानकारी का उपयोग कैसे होता है',
    paragraphs: [
      'जानकारी का उपयोग खाते सत्यापित करने, संपत्ति पूछताछ और बुकिंग संसाधित करने, भुगतान और ईएमआई प्रबंधित करने, केवाईसी की समीक्षा, सेवा अपडेट भेजने, धोखाधड़ी रोकने और सहायता देने के लिए होता है।',
      'हम व्यक्तिगत जानकारी बेचते नहीं हैं। भुगतान, होस्टिंग, संचार, दस्तावेज़ संग्रहण, कानूनी अनुपालन या माँगी गई सेवा के लिए आवश्यक होने पर अधिकृत सेवा प्रदाताओं के साथ जानकारी साझा की जा सकती है।',
    ],
  },
  {
    title: 'दस्तावेज़ और भुगतान सुरक्षा',
    paragraphs: [
      'अपलोड किए गए पहचान और लेन-देन दस्तावेज़ केवल अधिकृत प्रक्रियाओं और कर्मचारियों तक सीमित रहते हैं। कार्ड या यूपीआई भुगतान चुने गए पेमेंट गेटवे की सुरक्षा और गोपनीयता नीति के अनुसार संसाधित होता है।',
      'उचित प्रशासनिक और तकनीकी सुरक्षा उपाय उपयोग किए जाते हैं, लेकिन इंटरनेट पर किसी भी प्रसारण या संग्रहण प्रणाली की पूर्ण सुरक्षा की गारंटी नहीं दी जा सकती।',
    ],
  },
  {
    title: 'कुकीज़ और वेबसाइट विश्लेषण',
    paragraphs: [
      'वेबसाइट लॉगिन सत्र, प्राथमिकता, सुरक्षा और प्रदर्शन के लिए आवश्यक ब्राउज़र स्टोरेज, कुकीज़ या समान तकनीक का उपयोग कर सकती है। सक्षम होने पर तृतीय-पक्ष सेवाएँ अपनी कुकीज़ सेट कर सकती हैं।',
    ],
  },
  {
    title: 'जानकारी रखने की अवधि और आपके विकल्प',
    paragraphs: [
      'जानकारी केवल बताए गए उद्देश्यों, अनुबंध, विवाद समाधान और कानूनी या लेखा आवश्यकताओं के लिए जरूरी अवधि तक रखी जाती है।',
      'लागू कानून के अधीन उपयोगकर्ता गलत प्रोफाइल जानकारी सुधारने का अनुरोध कर सकते हैं या कंपनी के संपर्क माध्यमों से अपनी जानकारी के बारे में प्रश्न पूछ सकते हैं।',
    ],
  },
  {
    title: 'नीति अपडेट और संपर्क',
    paragraphs: [
      'तकनीक, सेवाओं या कानूनी आवश्यकताओं में बदलाव के अनुसार यह गोपनीयता नीति अपडेट की जा सकती है। महत्वपूर्ण बदलाव इस पेज पर दिखाए जाएँगे।',
      'गोपनीयता से जुड़े प्रश्नों के लिए वेबसाइट पर प्रकाशित फोन, ईमेल या कार्यालय विवरण से MMR Constructions से संपर्क करें।',
    ],
  },
];

@Component({
  selector: 'app-legal-page',
  standalone: true,
  imports: [CommonModule, RouterLink, NavbarComponent, FooterComponent, TranslatePipe],
  templateUrl: './legal-page.component.html',
  styleUrls: ['./legal-page.component.css'],
})
export class LegalPageComponent implements OnInit {
  type: 'terms' | 'privacy' = 'terms';
  title = '';
  description = '';
  icon = '';
  sections: LegalSection[] = [];

  constructor(
    private route: ActivatedRoute,
    private seo: SeoService,
    public language: LanguageService,
  ) {
    effect(() => {
      this.language.current();
      this.applyLanguage();
    });
  }

  ngOnInit(): void {
    this.type = this.route.snapshot.data['type'] === 'privacy' ? 'privacy' : 'terms';
    this.applyLanguage();
  }

  private applyLanguage(): void {
    const privacy = this.type === 'privacy';
    const hindi = this.language.current() === 'hi';
    this.title = privacy
      ? (hindi ? 'गोपनीयता नीति' : 'Privacy Policy')
      : (hindi ? 'नियम और शर्तें' : 'Terms & Conditions');
    this.description = privacy
      ? (hindi
          ? 'जानें कि MMR Constructions वेबसाइट, ग्राहक और लेन-देन की जानकारी कैसे एकत्र, उपयोग और सुरक्षित करता है।'
          : 'Learn how MMR Constructions collects, uses and protects website, customer and transaction information.')
      : (hindi
          ? 'MMR Constructions वेबसाइट, संपत्ति जानकारी, बुकिंग और ग्राहक सेवाओं के उपयोग से जुड़े नियम पढ़ें।'
          : 'Read the terms governing use of the MMR Constructions website, property information, bookings and customer services.');
    this.icon = privacy ? 'fas fa-user-shield' : 'fas fa-file-contract';
    this.sections = privacy
      ? (hindi ? PRIVACY_SECTIONS_HI : PRIVACY_SECTIONS)
      : (hindi ? TERMS_SECTIONS_HI : TERMS_SECTIONS);
    const path = privacy ? '/privacy-policy' : '/terms-and-conditions';
    this.seo.set({
      title: `${this.title} | MMR Constructions`,
      description: this.description,
      canonical: `https://mmrconstructions.in${path}`,
      keywords: `${this.title}, MMR Constructions, property booking policy, real estate Unnao`,
    });
    this.seo.setBreadcrumb([
      { name: 'Home', url: '/' },
      { name: this.title, url: path },
    ]);
  }
}

import React from 'react';
import Icon from '../../../components/AppIcon';

const Footer = () => {
  const currentYear = new Date()?.getFullYear();

  const footerLinks = {
    'About BMTOA': [
      { label: 'Our Story', href: '#' },
      { label: 'Leadership Team', href: '#' },
      { label: 'Mission & Vision', href: '#' },
      { label: 'Annual Reports', href: '#' },
      { label: 'News & Updates', href: '#' }
    ],
    'Membership': [
      { label: 'Join Now', href: '#registration' },
      { label: 'Membership Tiers', href: '#' },
      { label: 'Benefits Overview', href: '#benefits' },
      { label: 'Member Directory', href: '#' },
      { label: 'Renewal Process', href: '#' }
    ],
    'Services': [
      { label: 'TaxiCab Platform', href: '#' },
      { label: 'Better Operating Conditions', href: '#' },
      { label: 'Support Programs', href: '#' },
      { label: 'Fleet Management', href: '#' },
      { label: 'Financial Services', href: '#' }
    ],
    'Support': [
      { label: 'Contact Us', href: '#contact' },
      { label: 'Help Center', href: '#' },
      { label: 'Member Portal', href: '#' },
      { label: 'Technical Support', href: '#' },
      { label: 'Emergency Assistance', href: '#' }
    ]
  };

  const socialLinks = [
    { name: 'Facebook', icon: 'Facebook', href: 'https://facebook.com/bmtoa' },
    { name: 'Twitter', icon: 'Twitter', href: 'https://twitter.com/bmtoa' },
    { name: 'LinkedIn', icon: 'Linkedin', href: 'https://linkedin.com/company/bmtoa' },
    { name: 'WhatsApp', icon: 'MessageCircle', href: 'https://wa.me/263123456789' }
  ];



  const handleLinkClick = (href) => {
    if (href?.startsWith('#')) {
      const element = document.getElementById(href?.substring(1));
      if (element) {
        element?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      window.open(href, '_blank');
    }
  };

  return (
    <footer className="bg-slate-900 text-white">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Company Info */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                <Icon name="Car" size={28} color="white" />
              </div>
              <div>
                <div className="text-2xl font-bold">BMTOA</div>
                <div className="text-sm text-slate-300">
                  Bulawayo Metered Taxi Operators Association
                </div>
              </div>
            </div>
            
            <p className="text-slate-300 mb-6 leading-relaxed">
              Zimbabwe's premier taxi association, empowering professional taxi operations since 2018.
              Join our community of 150+ trusted operators and drivers committed to excellence in transportation services.
            </p>

            {/* Contact Info */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center space-x-3">
                <Icon name="MapPin" size={16} className="text-primary" />
                <span className="text-sm text-slate-300">Number 10 – 10th Avenue Corner Robert Mugabe Road, Bulawayo</span>
              </div>
              <div className="flex items-center space-x-3">
                <Icon name="Phone" size={16} className="text-primary" />
                <span className="text-sm text-slate-300">+263 789 810 506</span>
              </div>
              <div className="flex items-center space-x-3">
                <Icon name="Mail" size={16} className="text-primary" />
                <span className="text-sm text-slate-300">info@bmtoa.co.zw</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4">
              {socialLinks?.map((social) => (
                <button
                  key={social?.name}
                  onClick={() => handleLinkClick(social?.href)}
                  className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-primary transition-colors duration-200"
                  aria-label={social?.name}
                >
                  <Icon name={social?.icon} size={18} />
                </button>
              ))}
            </div>
          </div>

          {/* Footer Links */}
          {Object.entries(footerLinks)?.map(([category, links]) => (
            <div key={category}>
              <h4 className="text-lg font-semibold mb-4">{category}</h4>
              <ul className="space-y-3">
                {links?.map((link) => (
                  <li key={link?.label}>
                    <button
                      onClick={() => handleLinkClick(link?.href)}
                      className="text-slate-300 hover:text-white transition-colors duration-200 text-sm"
                    >
                      {link?.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>



        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-slate-700">
          <div className="text-center max-w-2xl mx-auto">
            <h4 className="text-xl font-semibold mb-2">Stay Updated</h4>
            <p className="text-slate-300 mb-6">
              Get the latest news, updates, and exclusive member benefits delivered to your inbox.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-4 py-3 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <button className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors duration-200 flex items-center justify-center space-x-2">
                <Icon name="Send" size={16} />
                <span>Subscribe</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Bottom Bar */}
      <div className="border-t border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-sm text-slate-400">
              © {currentYear} Bulawayo Metered Taxi Operators Association. All rights reserved.
            </div>
            
            <div className="flex flex-wrap items-center space-x-6 text-sm text-slate-400">
              <button className="hover:text-white transition-colors duration-200">
                Privacy Policy
              </button>
              <button className="hover:text-white transition-colors duration-200">
                Terms of Service
              </button>
              <button className="hover:text-white transition-colors duration-200">
                Cookie Policy
              </button>
              <button className="hover:text-white transition-colors duration-200">
                Accessibility
              </button>
            </div>
          </div>
          
          {/* Additional Info */}
          <div className="mt-4 pt-4 border-t border-slate-800 text-center">
            <div className="text-xs text-slate-500">
              BMTOA is recognised by all stakeholders in the Transport Industry
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

const FAQSection = () => {
  const [openFAQ, setOpenFAQ] = useState(0);

  const faqs = [
    {
      question: 'What are the membership costs and payment options?',
      answer: `BMTOA offers a single membership category:\n\n• Joining Fee: $150.00 (includes $100 membership fee + $50 App Development fee)\n• Monthly Subscription: $10.00\n\nWe accept EcoCash, bank transfers, cash deposits at our office, and USD cards. All payments are processed securely and you can change your payment method anytime.`,
      category: 'Membership'
    },
    {
      question: 'What vehicles qualify for BMTOA membership?',
      answer: `All BMTOA members are required to have a valid operating permit.\n\nWe welcome all types of taxi vehicles including:\n\n• Sedans (Toyota Corolla, Honda Civic, Nissan Sentra)\n• Hatchbacks (Toyota Vitz, Honda Fit)\n• SUVs and crossovers\n• Minibuses for shared taxi services\n\nVehicles must be roadworthy, properly licensed, and pass our safety inspection. We provide guidance on vehicle upgrades if needed.`,
      category: 'Requirements'
    },
    {
      question: 'How does the e-hailing platform work?',
      answer: `Our e-hailing platform connects you directly with customers:\n\n• Download the TaxiCab App (free for members)\n• Receive real-time booking notifications\n• GPS navigation guides you to pickup locations\n• Accept digital payments through the app\n• Build your customer rating and reputation\n\nThe platform is exclusively for BMTOA members, giving you access to a premium customer base.`,
      category: 'Technology'
    },
    {
      question: 'What insurance benefits do I get?',
      answer: `BMTOA members have access to various insurance products at negotiated rates:\n\n• Accident cover for both passengers and drivers\n• Competitive rates through our partnerships\n• Simplified claims process\n• Dedicated support for insurance matters\n\nOur insurance partnerships help protect you and your passengers while keeping costs manageable.`,
      category: 'Insurance'
    },
    {
      question: 'What training programs are included?',
      answer: `All members receive comprehensive training:\n\n• Customer service excellence (2-day workshop)\n• Defensive driving and safety (1-day course)\n• Digital platform usage (half-day session)\n• Business management basics (evening classes)\n• First aid certification (optional)\n\nOur training programs help you deliver professional service and grow your business.`,
      category: 'Training'
    },
    {
      question: 'What professional benefits do I get as a member?',
      answer: `BMTOA members enjoy significant professional advantages:\n\n• Official BMTOA certification and credentials\n• Access to premium service opportunities\n• Industry recognition and credibility\n• Professional development programs\n• Networking with industry leaders\n\nOur certification is recognized throughout Zimbabwe and opens doors to higher-paying contracts and partnerships.`,
      category: 'Professional Benefits'
    },
    {
      question: 'What support is available for members?',
      answer: `We provide comprehensive support for all members:\n\n• Personal onboarding session with membership coordinator\n• Mentorship program with experienced operators\n• Access to member WhatsApp groups for peer support\n• 24/7 support available\n• Priority customer service for any issues\n\nOur team is here to help you succeed in your taxi business.`,
      category: 'Support'
    },
    {
      question: 'How do I get started with BMTOA?',
      answer: `Getting started is simple:\n\n1. Complete the online registration form\n2. Submit required documents (driver's license, vehicle registration, operating permit)\n3. Pay the joining fee of $150.00\n4. Schedule your vehicle inspection (free)\n5. Attend new member orientation (2 hours)\n6. Download the TaxiCab App and start earning\n\nThe entire process takes 3-5 business days. We'll guide you through every step and ensure you're ready to maximize your membership benefits.`,
      category: 'Getting Started'
    }
  ];

  const categories = ['All', 'Pricing', 'Requirements', 'Technology', 'Training', 'Insurance', 'Support', 'Membership', 'Getting Started'];
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredFAQs = selectedCategory === 'All' 
    ? faqs 
    : faqs?.filter(faq => faq?.category === selectedCategory);

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? -1 : index);
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="HelpCircle" size={16} />
            <span>Frequently Asked Questions</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Everything You Need to Know
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Get answers to common questions about BMTOA membership, benefits, and how to get started
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {categories?.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category
                  ? 'bg-primary text-white' :'bg-slate-100 text-text-secondary hover:bg-slate-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* FAQ Accordion */}
        <div className="space-y-4">
          {filteredFAQs?.map((faq, index) => (
            <div
              key={index}
              className="bg-slate-50 rounded-lg border border-border overflow-hidden hover:shadow-card transition-shadow duration-200"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-slate-100 transition-colors duration-200"
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center mt-1">
                    <Icon name="HelpCircle" size={16} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary pr-4">
                      {faq?.question}
                    </h3>
                    <div className="text-sm text-primary font-medium mt-1">
                      {faq?.category}
                    </div>
                  </div>
                </div>
                <Icon
                  name={openFAQ === index ? "ChevronUp" : "ChevronDown"}
                  size={20}
                  className="text-text-secondary flex-shrink-0"
                />
              </button>
              
              {openFAQ === index && (
                <div className="px-6 pb-6">
                  <div className="pl-12">
                    <div className="prose prose-sm max-w-none">
                      {faq?.answer?.split('\n')?.map((paragraph, pIndex) => (
                        <p key={pIndex} className="text-text-secondary leading-relaxed mb-3 last:mb-0">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 text-center">
          <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-2xl p-8 border border-border">
            <Icon name="MessageCircle" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-text-primary mb-4">
              Still Have Questions?
            </h3>
            <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
              Our membership team is here to help. Get personalized answers and guidance about joining BMTOA.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => window.open('https://wa.me/263789810506?text=Hi, I have questions about BMTOA membership. Can you help me?', '_blank')}
                className="inline-flex items-center space-x-2 bg-green-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-600 transition-colors duration-200"
              >
                <Icon name="MessageCircle" size={20} />
                <span>WhatsApp Support</span>
              </button>

              <button
                onClick={() => window.open('tel:+263789810506', '_blank')}
                className="inline-flex items-center space-x-2 bg-white text-primary border-2 border-primary px-6 py-3 rounded-lg font-medium hover:bg-primary hover:text-white transition-colors duration-200"
              >
                <Icon name="Phone" size={20} />
                <span>Call Us Now</span>
              </button>
            </div>

            <div className="mt-4 text-sm text-text-secondary">
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex items-center space-x-4">
                  <span>📞 BMTOA: +263 789 810 506</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>📞 Chairman: +263 772 515 204</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>📞 Secretary: +263 775 256 126</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span>📧 info@bmtoa.co.zw</span>
                </div>
              </div>
              <div className="mt-2 text-center">
                Office Hours: Monday - Friday, 0800Hrs - 1500Hrs CAT
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
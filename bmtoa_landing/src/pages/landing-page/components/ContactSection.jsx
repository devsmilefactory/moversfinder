import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const ContactSection = () => {
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contactMethods = [
    {
      icon: 'Phone',
      title: 'Call Us',
      description: 'Speak directly with our membership team',
      contact: '+263 789 810 506',
      action: () => window.open('tel:+263789810506'),
      available: 'Mon-Fri, 8AM-3PM CAT'
    },
    {
      icon: 'MessageCircle',
      title: 'WhatsApp',
      description: 'Quick support via WhatsApp',
      contact: '+263 789 810 506',
      action: () => window.open('https://wa.me/263789810506?text=Hi, I need information about BMTOA membership'),
      available: '24/7 Response'
    },
    {
      icon: 'Mail',
      title: 'Email',
      description: 'Send us a detailed message',
      contact: 'info@bmtoa.co.zw',
      action: () => window.open('mailto:info@bmtoa.co.zw'),
      available: 'Response within 24hrs'
    },
    {
      icon: 'MapPin',
      title: 'Visit Office',
      description: 'Meet us in person',
      contact: 'Number 10 – 10th Avenue Corner Robert Mugabe Road, Bulawayo',
      action: () => window.open('https://maps.google.com/?q=-20.1500,28.5833'),
      available: 'Mon-Fri, 8AM-3PM'
    }
  ];

  const handleInputChange = (field, value) => {
    setContactForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setIsSubmitting(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      alert(`Thank you ${contactForm?.name}! Your message has been sent successfully. We'll get back to you within 24 hours.`);
      
      // Reset form
      setContactForm({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
    } catch (error) {
      alert('There was an error sending your message. Please try again or contact us directly.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Icon name="MessageSquare" size={16} />
            <span>Get In Touch</span>
          </div>
          <h2 className="text-4xl font-bold text-text-primary mb-4">
            Ready to Transform Your Taxi Business?
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto">
            Have questions about membership? Need help getting started? Our team is here to support your journey to professional taxi operations.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Methods */}
          <div className="space-y-8">
            <div>
              <h3 className="text-2xl font-bold text-text-primary mb-6">
                Multiple Ways to Reach Us
              </h3>
              <p className="text-text-secondary mb-8">
                Choose the contact method that works best for you. Our team is committed to providing prompt, helpful responses.
              </p>
            </div>

            <div className="grid gap-6">
              {contactMethods?.map((method, index) => (
                <div
                  key={method?.title}
                  className="bg-slate-50 rounded-xl p-6 hover:shadow-card transition-all duration-200 cursor-pointer group"
                  onClick={method?.action}
                >
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <Icon name={method?.icon} size={24} className="text-primary group-hover:text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-text-primary mb-1">
                        {method?.title}
                      </h4>
                      <p className="text-text-secondary text-sm mb-2">
                        {method?.description}
                      </p>
                      <div className="text-primary font-medium mb-1">
                        {method?.contact}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {method?.available}
                      </div>
                    </div>
                    <Icon name="ExternalLink" size={16} className="text-text-secondary group-hover:text-primary transition-colors duration-200" />
                  </div>
                </div>
              ))}
            </div>

            {/* Office Hours */}
            <div className="bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl p-6 border border-border">
              <h4 className="text-lg font-semibold text-text-primary mb-4 flex items-center space-x-2">
                <Icon name="Clock" size={20} className="text-primary" />
                <span>Office Hours</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-secondary">Monday - Friday:</span>
                  <span className="text-text-primary font-medium">0800Hrs - 1500Hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Saturday:</span>
                  <span className="text-text-primary font-medium">0830Hrs - 1000Hrs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-secondary">Sunday:</span>
                  <span className="text-text-primary font-medium">Closed</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="text-text-secondary">Support:</span>
                  <span className="text-success font-medium">24/7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-slate-50 rounded-2xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-text-primary mb-2">
                Send Us a Message
              </h3>
              <p className="text-text-secondary">
                Fill out the form below and we'll get back to you within 24 hours.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  type="text"
                  placeholder="Your full name"
                  value={contactForm?.name}
                  onChange={(e) => handleInputChange('name', e?.target?.value)}
                  required
                />
                <Input
                  label="Phone Number"
                  type="tel"
                  placeholder="+263 123 456 789"
                  value={contactForm?.phone}
                  onChange={(e) => handleInputChange('phone', e?.target?.value)}
                  required
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="your.email@example.com"
                value={contactForm?.email}
                onChange={(e) => handleInputChange('email', e?.target?.value)}
                required
              />

              <Input
                label="Subject"
                type="text"
                placeholder="What can we help you with?"
                value={contactForm?.subject}
                onChange={(e) => handleInputChange('subject', e?.target?.value)}
                required
              />

              <div>
                <label className="block text-sm font-medium text-text-primary mb-2">
                  Message
                </label>
                <textarea
                  rows={5}
                  placeholder="Tell us more about your inquiry..."
                  value={contactForm?.message}
                  onChange={(e) => handleInputChange('message', e?.target?.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="default"
                size="lg"
                fullWidth
                loading={isSubmitting}
                iconName="Send"
                iconPosition="left"
              >
                {isSubmitting ? 'Sending Message...' : 'Send Message'}
              </Button>
            </form>

            {/* Response Time Promise */}
            <div className="mt-6 text-center">
              <div className="inline-flex items-center space-x-2 text-sm text-success">
                <Icon name="CheckCircle" size={16} />
                <span>We typically respond within 2-4 hours during business hours</span>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-text-primary mb-2">
              Visit Our Office
            </h3>
            <p className="text-text-secondary">
              Located in the heart of Bulawayo for easy access
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-card border border-border overflow-hidden">
            <div className="h-96 relative">
              <iframe
                width="100%"
                height="100%"
                loading="lazy"
                title="BMTOA Office Location"
                referrerPolicy="no-referrer-when-downgrade"
                src="https://www.google.com/maps?q=-20.1500,28.5833&z=14&output=embed"
                className="rounded-t-2xl"
              />
            </div>

            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="flex items-start space-x-3">
                  <Icon name="MapPin" size={20} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-text-primary">Address</div>
                    <div className="text-sm text-text-secondary">
                      Number 10 – 10th Avenue<br />
                      Corner Robert Mugabe Road<br />
                      Bulawayo, Zimbabwe
                    </div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Icon name="Bus" size={20} className="text-primary flex-shrink-0 mt-1" />
                  <div>
                    <div className="font-semibold text-text-primary">Public Transport</div>
                    <div className="text-sm text-text-secondary">
                      Multiple bus routes<br />
                      Central location access
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
'use client';

import { ContactForm } from '@/components/contact/ContactForm';
import { ContactInfo } from '@/components/contact/ContactInfo';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function ContactPage() {
  const t = useTranslations('contact');

  const faqs = [
    { question: t('faq.q1'), answer: t('faq.a1') },
    { question: t('faq.q2'), answer: t('faq.a2') },
    { question: t('faq.q3'), answer: t('faq.a3') },
    { question: t('faq.q4'), answer: t('faq.a4') },
  ];

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative py-16 pb-20 md:py-24 md:pb-32 overflow-hidden bg-primary/5">
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="container relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-3xl mx-auto text-center"
          >
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-600">
              {t('title')}
            </h1>
            <p className="text-xl text-muted-foreground leading-relaxed">
              {t('subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Main Content Area */}
      <section className="container -mt-20 relative z-20 pb-20">
        <div className="mb-16">
          <ContactInfo />
        </div>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          {/* Contact Form Column */}
          <div className="lg:col-span-7">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <ContactForm />
            </motion.div>
          </div>

          {/* FAQ Column */}
          <div className="lg:col-span-5 space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="space-y-6"
            >
              <div>
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                  {t('faq.title')}
                </h2>
                <div className="space-y-4">
                  {faqs.map((faq, index) => (
                    <Card key={index} className="border-none shadow-sm bg-muted/30">
                      <CardContent className="pt-6">
                        <h3 className="font-bold text-lg mb-2 text-foreground">{faq.question}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          {faq.answer}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="p-8 rounded-2xl bg-gradient-to-br from-primary to-purple-600 text-primary-foreground shadow-xl transform transition-transform hover:scale-[1.02]">
                <h3 className="font-bold text-2xl mb-2">{t('help.title')}</h3>
                <p className="opacity-90 mb-6 text-lg">
                  {t('help.subtitle')}
                </p>
                <Button variant="secondary" size="lg" className="w-full font-semibold">
                  {t('help.helpCenter')}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>


      {/* Map Section */}
      <section className="h-[400px] w-full bg-muted/50 relative flex items-center justify-center grayscale hover:grayscale-0 transition-all duration-700">
        <div className="text-center p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-background shadow-lg mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary w-8 h-8"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
          </div>
          <h3 className="text-xl font-bold">{t('help.officeTitle')}</h3>
          <p className="text-muted-foreground">{t('help.officeAddress')}</p>
        </div>
      </section>
    </div>
  );
}

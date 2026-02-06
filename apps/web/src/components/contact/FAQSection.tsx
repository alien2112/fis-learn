
'use client';

import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
    {
        question: 'How do I initiate a refund?',
        answer: 'You can request a refund within 30 days of purchase directly from your account settings under "Order History". Refunds are processed within 3-5 business days.',
    },
    {
        question: 'Do you offer certificates for completed courses?',
        answer: 'Yes! Every paid course comes with a verified completion certificate that you can add to your LinkedIn profile or download as a PDF.',
    },
    {
        question: 'Can I access the courses offline?',
        answer: 'Yes, if you use our mobile app (iOS and Android), you can download lessons for offline viewing. Web access requires an internet connection.',
    },
    {
        question: 'Is there a discount for students or non-profits?',
        answer: 'We offer a 50% discount for students with a valid .edu email address and registered non-profit organizations. Contact us above to apply.',
    },
];

export function FAQSection() {
    return (
        <section className="py-24 bg-secondary/20">
            <div className="container max-w-3xl">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold tracking-tight mb-4">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground">Quick answers to common questions about our platform.</p>
                </div>

                <Accordion type="single" collapsible className="w-full bg-background rounded-2xl border px-6 py-2">
                    {faqs.map((faq, index) => (
                        <AccordionItem key={index} value={`item-${index}`} className="border-b-0">
                            <AccordionTrigger className="text-left font-semibold py-4 hover:text-primary transition-colors">
                                {faq.question}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground pb-4 leading-relaxed">
                                {faq.answer}
                            </AccordionContent>
                            {index < faqs.length - 1 && <div className="h-px bg-border my-2" />}
                        </AccordionItem>
                    ))}
                </Accordion>
            </div>
        </section>
    );
}

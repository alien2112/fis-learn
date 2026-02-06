'use client';

import { motion } from 'framer-motion';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useTranslations } from 'next-intl';

export function ContactInfo() {
    const t = useTranslations('contact');

    const contactInfo = [
        {
            icon: Mail,
            title: t('email.title'),
            content: t('email.value'),
            description: t('email.note'),
            color: 'text-blue-500',
            bg: 'bg-blue-500/10',
        },
        {
            icon: Phone,
            title: t('phone.title'),
            content: t('phone.value'),
            description: t('phone.note'),
            color: 'text-green-500',
            bg: 'bg-green-500/10',
        },
        {
            icon: MapPin,
            title: t('visit.title'),
            content: t('visit.address'),
            description: t('visit.city'),
            color: 'text-purple-500',
            bg: 'bg-purple-500/10',
        },
        {
            icon: Clock,
            title: t('hours.title'),
            content: t('hours.weekdays'),
            description: t('hours.weekend'),
            color: 'text-orange-500',
            bg: 'bg-orange-500/10',
        },
    ];

    return (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => (
                <motion.div
                    key={info.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                >
                    <div className="h-full group relative">
                        <div className={`absolute inset-0 bg-gradient-to-br ${info.bg.replace('/10', '/30')} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl blur-xl -z-10`} />
                        <Card className="h-full border-border/50 bg-background/60 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                            <CardContent className="pt-8 flex flex-col items-center text-center p-6 h-full justify-between">
                                <div>
                                    <div className={`w-14 h-14 rounded-2xl ${info.bg} flex items-center justify-center mb-6 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-inner`}>
                                        <info.icon className={`h-7 w-7 ${info.color}`} />
                                    </div>
                                    <h3 className="font-bold text-xl mb-2">{info.title}</h3>
                                    <p className="font-medium text-foreground mb-2 select-all break-all">{info.content}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-4 py-2 px-4 rounded-full bg-muted/50">{info.description}</p>
                            </CardContent>
                        </Card>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

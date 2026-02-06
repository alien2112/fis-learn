'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, Loader2, CheckCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

export function ContactForm() {
    const t = useTranslations('contact.form');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('submitting');
        await new Promise((resolve) => setTimeout(resolve, 2000));
        setStatus('success');
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    const handleFocus = (field: string) => setFocusedField(field);
    const handleBlur = () => setFocusedField(null);

    if (status === 'success') {
        return (
            <Card className="h-full border-2 border-green-500/20 bg-green-50/50 dark:bg-green-900/10 shadow-lg">
                <CardContent className="h-full flex flex-col items-center justify-center text-center p-12">
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="w-20 h-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6"
                    >
                        <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                    </motion.div>
                    <h3 className="text-2xl font-bold mb-3 text-green-900 dark:text-green-100">{t('successTitle')}</h3>
                    <p className="text-muted-foreground mb-8 text-lg max-w-sm">
                        {t('successMessage', { name: formData.name || t('friend') })}
                    </p>
                    <Button
                        onClick={() => setStatus('idle')}
                        variant="outline"
                        className="min-w-[150px] border-green-200 hover:bg-green-100 hover:text-green-800 dark:border-green-800 dark:hover:bg-green-900"
                    >
                        {t('sendAnother')}
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="shadow-lg border-muted/60 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />

            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold">{t('title')}</CardTitle>
                <CardDescription>
                    {t('subtitle')}
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2 relative group">
                            <Label
                                htmlFor="name"
                                className={cn("transition-colors", focusedField === 'name' ? "text-primary" : "")}
                            >
                                {t('name')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="name"
                                    placeholder={t('namePlaceholder')}
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    onFocus={() => handleFocus('name')}
                                    onBlur={handleBlur}
                                    required
                                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background"
                                />
                            </div>
                        </div>

                        <div className="space-y-2 relative group">
                            <Label
                                htmlFor="email"
                                className={cn("transition-colors", focusedField === 'email' ? "text-primary" : "")}
                            >
                                {t('email')}
                            </Label>
                            <div className="relative">
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder={t('emailPlaceholder')}
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    onFocus={() => handleFocus('email')}
                                    onBlur={handleBlur}
                                    required
                                    className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 relative group">
                        <Label
                            htmlFor="subject"
                            className={cn("transition-colors", focusedField === 'subject' ? "text-primary" : "")}
                        >
                            {t('subject')}
                        </Label>
                        <Input
                            id="subject"
                            placeholder={t('subjectPlaceholder')}
                            value={formData.subject}
                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                            onFocus={() => handleFocus('subject')}
                            onBlur={handleBlur}
                            required
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background"
                        />
                    </div>

                    <div className="space-y-2 relative group">
                        <div className="flex justify-between items-center">
                            <Label
                                htmlFor="message"
                                className={cn("transition-colors", focusedField === 'message' ? "text-primary" : "")}
                            >
                                {t('message')}
                            </Label>
                            <span className="text-xs text-muted-foreground font-light">{t('maxChars')}</span>
                        </div>
                        <Textarea
                            id="message"
                            placeholder={t('messagePlaceholder')}
                            rows={5}
                            value={formData.message}
                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                            onFocus={() => handleFocus('message')}
                            onBlur={handleBlur}
                            required
                            className="transition-all duration-300 focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background resize-none"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full h-12 text-base font-medium shadow-md transition-all hover:translate-y-[-2px] hover:shadow-lg"
                        disabled={status === 'submitting'}
                    >
                        {status === 'submitting' ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                {t('sending')}
                            </>
                        ) : (
                            <>
                                {t('send')}
                                <Send className="ml-2 h-5 w-5" />
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground mt-4 flex items-center justify-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-500" />
                        <span>{t('replyNote')}</span>
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}

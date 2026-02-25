import { useTranslations } from 'next-intl';

export default function PressPage() {
  const t = useTranslations('footer');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-6">{t('press')}</h1>
        <p className="text-xl text-gray-600 mb-12">
          Latest news, updates, and media resources from FIS Learn.
        </p>

        <div className="grid gap-8">
          <div className="border-b pb-8">
            <span className="text-sm text-gray-500">February 10, 2026</span>
            <h2 className="text-2xl font-semibold mt-2 mb-3">FIS Learn reaches 10,000 active students</h2>
            <p className="text-gray-600">
              We are thrilled to announce a major milestone in our mission to democratize education.
            </p>
          </div>
          
          <div className="border-b pb-8">
            <span className="text-sm text-gray-500">January 15, 2026</span>
            <h2 className="text-2xl font-semibold mt-2 mb-3">Launching the new Enterprise Dashboard</h2>
            <p className="text-gray-600">
              New tools for teams to track progress and assign learning paths.
            </p>
          </div>
        </div>

        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">Media Contact</h3>
          <p className="text-gray-600">
            For press inquiries, please contact <a href="mailto:press@fislearn.com" className="text-blue-600 hover:underline">press@fislearn.com</a>
          </p>
        </div>
      </div>
    </div>
  );
}

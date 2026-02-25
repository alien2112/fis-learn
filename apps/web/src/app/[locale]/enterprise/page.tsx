import { useTranslations } from 'next-intl';

export default function EnterprisePage() {
  const t = useTranslations('footer');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">{t('forEnterprise')}</h1>
        <p className="text-xl text-gray-600 mb-8">
          Empower your team with world-class technical training.
        </p>
        <div className="bg-blue-50 p-8 rounded-lg border border-blue-100">
          <h2 className="text-2xl font-semibold mb-4 text-blue-900">Enterprise Solutions</h2>
          <p className="mb-6 text-blue-800">
            We offer custom learning paths, team analytics, and dedicated support for organizations of all sizes.
          </p>
          <button className="bg-blue-600 text-white px-6 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
}

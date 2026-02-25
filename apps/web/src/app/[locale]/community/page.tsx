import { useTranslations } from 'next-intl';

export default function CommunityPage() {
  const t = useTranslations('community');

  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-4xl font-bold mb-6">{t('title')}</h1>
        <p className="text-xl text-gray-600 mb-12">
          Join thousands of learners, instructors, and industry experts.
        </p>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-xl font-semibold mb-2">Discussions</h3>
            <p className="text-gray-600">Engage in deep technical discussions with peers.</p>
          </div>
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🆘</div>
            <h3 className="text-xl font-semibold mb-2">Help & Support</h3>
            <p className="text-gray-600">Get stuck? The community is here to help you debug.</p>
          </div>
          <div className="p-6 border rounded-xl hover:shadow-md transition-shadow">
            <div className="text-4xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Showcase</h3>
            <p className="text-gray-600">Show off your projects and get feedback.</p>
          </div>
        </div>

        <div className="bg-indigo-50 p-8 rounded-xl">
          <h2 className="text-2xl font-bold mb-4 text-indigo-900">Ready to join the conversation?</h2>
          <p className="mb-6 text-indigo-700">
            Access to the community is available to all enrolled students.
          </p>
          <div className="flex justify-center gap-4">
            <a href="/courses" className="bg-indigo-600 text-white px-6 py-3 rounded-md font-medium hover:bg-indigo-700 transition-colors">
              Browse Courses
            </a>
            <a href="/login" className="bg-white text-indigo-600 border border-indigo-200 px-6 py-3 rounded-md font-medium hover:bg-gray-50 transition-colors">
              Log In
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

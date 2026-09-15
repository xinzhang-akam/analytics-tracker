import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Analytics Project Timeline Tracker
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Track detailed project step timelines and display executive stakeholder dashboard
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href="/projects"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Analyst Editor
            </h2>
            <p className="text-gray-600">
              Manage projects, define steps, track timelines, and log date changes
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Executive Dashboard
            </h2>
            <p className="text-gray-600">
              View milestone pipeline and track project progress across teams
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

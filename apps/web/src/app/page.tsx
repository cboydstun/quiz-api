import Link from "next/link";

const DroneIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="h-12 w-12"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M22 10.5V8l-2.5-2.5-3.5 3.5h-3L10.5 6.5 8 9 6.5 7.5 4 10l1.5 1.5L4 13l2.5 2.5 3.5-3.5h3l2.5 2.5 2.5-2.5-1.5-1.5L18 9l1.5 1.5L22 8v2.5zm-7 2.5h-6v-1h6v1zm-2-2h-2v-1h2v1z" />
  </svg>
);

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <header className="text-center mb-16">
        <h1 className="text-5xl md:text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-linear-to-r from-blue-600 to-purple-600 animate-pulse">
          Master Your Part 107 Drone License
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-700">
          Elevate your skills and soar through your FAA certification with our
          interactive quiz app
        </p>
        <Link
          href="/quiz"
          className="bg-linear-to-r from-blue-500 to-purple-600 text-white font-bold py-4 px-8 rounded-full text-lg transition duration-300 transform hover:scale-105 hover:shadow-lg inline-flex items-center"
        >
          <DroneIcon />
          <span className="ml-2">Launch Free Quiz</span>
        </Link>
      </header>

      <section className="grid md:grid-cols-3 gap-8 mb-16">
        {[
          {
            title: "Up-to-date Content",
            description: "Stay current with the latest FAA regulations",
          },
          {
            title: "Adaptive Learning",
            description: "Personalized quizzes that evolve with your progress",
          },
          {
            title: "Comprehensive Coverage",
            description: "Master all topics for the Part 107 exam",
          },
        ].map((feature, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-md transform transition duration-500 hover:scale-105 hover:shadow-xl"
          >
            <h2 className="text-2xl font-semibold mb-4 text-blue-600">
              {feature.title}
            </h2>
            <p className="text-gray-600">{feature.description}</p>
          </div>
        ))}
      </section>

      <section className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-6 text-gray-800">
          Join Our Community of Certified Pilots
        </h2>
        <div className="flex justify-center items-center space-x-4 mb-8">
          <span className="text-5xl font-bold text-blue-600">4.9</span>
          <div className="flex text-yellow-400 text-3xl">{"★".repeat(5)}</div>
          <span className="text-xl text-gray-600">(500+ reviews)</span>
        </div>
        <p className="text-xl text-gray-700 mb-8">
          Over 10,000 students have successfully earned their Part 107 license
          with our help
        </p>
        <div className="flex justify-center space-x-4">
          {[
            { count: "1000+", label: "Practice Questions" },
            { count: "98%", label: "Pass Rate" },
            { count: "24/7", label: "Support" },
          ].map((stat, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-md">
              <div className="text-3xl font-bold text-purple-600">
                {stat.count}
              </div>
              <div className="text-sm text-gray-600">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-linear-to-r from-blue-500 to-purple-600 p-10 rounded-2xl mb-16 text-white">
        <h2 className="text-3xl font-bold mb-6 text-center">
          Ready to Become a Certified Drone Pilot?
        </h2>
        <p className="text-center mb-8 text-xl">
          Start your journey today and navigate through your Part 107 exam with
          confidence
        </p>
        <div className="text-center">
          <Link
            href="/quiz"
            className="bg-white text-blue-600 font-bold py-3 px-8 rounded-full text-lg transition duration-300 transform hover:scale-105 hover:shadow-lg inline-flex items-center"
          >
            <span>Begin Free Trial</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </Link>
        </div>
      </section>
    </div>
  );
}

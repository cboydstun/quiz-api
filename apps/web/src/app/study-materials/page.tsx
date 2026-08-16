"use client";

import React from "react";

const topics = [
  "Applicable regulations",
  "Airspace classification and operating requirements",
  "Aviation weather sources and effects of weather on small unmanned aircraft performance",
  "Small unmanned aircraft loading and performance",
  "Emergency procedures",
  "Crew resource management",
  "Radio communication procedures",
  "Determining the performance of small unmanned aircraft",
  "Physiological effects of drugs and alcohol",
  "Aeronautical decision-making and judgment",
  "Airport operations",
  "Maintenance and preflight inspection procedures",
];

export default function StudyMaterialsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <h1 className="text-4xl font-bold mb-6 text-center text-blue-600">
          FAA Remote Pilot Study Guide
        </h1>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8 transition-all duration-300 transform hover:scale-105">
          <div className="p-6">
            <p className="text-gray-700 mb-4">
              This comprehensive study guide, provided by the Federal Aviation
              Administration (FAA), is an essential resource for those preparing
              for the Part 107 Remote Pilot Certificate. It covers all the key
              topics you need to know to become a certified drone pilot.
            </p>
            <a
              href="https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/remote_pilot_study_guide.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-blue-500 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 hover:bg-blue-600 transform hover:scale-105"
            >
              Download PDF
            </a>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-2xl font-bold mb-4 text-blue-600">
              Key Topics Covered
            </h2>
            <ul className="list-disc list-inside space-y-2">
              {topics.map((topic, index) => (
                <li
                  key={index}
                  className="text-gray-700 transition-all duration-300 hover:text-blue-600 hover:translate-x-2"
                >
                  {topic}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <h2 className="text-2xl font-bold p-4 bg-blue-500 text-white">
            Study Guide Preview
          </h2>
          <div className="aspect-video">
            <iframe
              src="https://www.faa.gov/sites/faa.gov/files/regulations_policies/handbooks_manuals/aviation/remote_pilot_study_guide.pdf"
              className="w-full h-full"
              title="FAA Remote Pilot Study Guide PDF"
            ></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';

export interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  risks: string[];
}

interface SWOTAnalysisProps {
  data: SWOTData;
}

export function SWOTAnalysis({ data }: SWOTAnalysisProps) {
  return (
    <div>
      <h2 className="text-xl font-semibold text-gray-900 mb-4">SWOT-Analyse</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        {data.strengths.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Stärken
            </h3>
            <ul className="space-y-2">
              {data.strengths.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-green-600 mt-0.5">✓</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Weaknesses */}
        {data.weaknesses.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Schwächen
            </h3>
            <ul className="space-y-2">
              {data.weaknesses.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-red-600 mt-0.5">✗</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Opportunities */}
        {data.opportunities.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Chancen
            </h3>
            <ul className="space-y-2">
              {data.opportunities.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">→</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Risks */}
        {data.risks.length > 0 && (
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">
              Risiken
            </h3>
            <ul className="space-y-2">
              {data.risks.map((item, index) => (
                <li key={index} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="text-orange-600 mt-0.5">!</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

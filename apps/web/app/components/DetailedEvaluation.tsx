'use client';

interface DetailedEvaluationData {
  summary: string;
  location_rating: 'green' | 'orange' | 'red';
  location_explanation: string;
  yield_rating: 'green' | 'orange' | 'red';
  yield_explanation: string;
  potential_rating: 'green' | 'orange' | 'red';
  potential_points: string[];
  overall_rating: 'green' | 'orange' | 'red';
  overall_summary: string;
  asking_price: number;
  recommended_price: number;
  discount_percentage: number;
  price_justification: string;
}

interface DetailedEvaluationProps {
  data: DetailedEvaluationData;
}

const getRatingEmoji = (rating: 'green' | 'orange' | 'red') => {
  switch (rating) {
    case 'green':
      return '🟢';
    case 'orange':
      return '🟠';
    case 'red':
      return '🔴';
    default:
      return '🟠';
  }
};

const getRatingColor = (rating: 'green' | 'orange' | 'red') => {
  switch (rating) {
    case 'green':
      return 'text-[#00A699]';
    case 'orange':
      return 'text-[#FFA500]';
    case 'red':
      return 'text-[#FF5A5F]';
    default:
      return 'text-[#FFA500]';
  }
};

const getRatingBg = (rating: 'green' | 'orange' | 'red') => {
  switch (rating) {
    case 'green':
      return 'bg-[#00A699]/10';
    case 'orange':
      return 'bg-[#FFA500]/10';
    case 'red':
      return 'bg-[#FF5A5F]/10';
    default:
      return 'bg-[#FFA500]/10';
  }
};

export function DetailedEvaluation({ data }: DetailedEvaluationProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-[#484848] mb-2">AI Investment-Bewertung</h2>
        <p className="text-gray-600">{data.summary}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Lage */}
        <div className={`p-4 rounded-lg ${getRatingBg(data.location_rating)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getRatingEmoji(data.location_rating)}</span>
            <h3 className="text-lg font-semibold text-[#484848]">Lage</h3>
          </div>
          <p className="text-gray-700">{data.location_explanation}</p>
        </div>

        {/* Rendite */}
        <div className={`p-4 rounded-lg ${getRatingBg(data.yield_rating)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getRatingEmoji(data.yield_rating)}</span>
            <h3 className="text-lg font-semibold text-[#484848]">Rendite & Wirtschaftlichkeit</h3>
          </div>
          <p className="text-gray-700">{data.yield_explanation}</p>
        </div>

        {/* Entwicklungspotenzial */}
        <div className={`p-4 rounded-lg ${getRatingBg(data.potential_rating)}`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">{getRatingEmoji(data.potential_rating)}</span>
            <h3 className="text-lg font-semibold text-[#484848]">Entwicklungspotenzial</h3>
          </div>
          <ul className="space-y-1">
            {data.potential_points.map((point, index) => (
              <li key={index} className="text-gray-700 flex items-start">
                <span className="mr-2">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Gesamtbewertung */}
        <div className={`p-6 rounded-lg ${getRatingBg(data.overall_rating)} border-2 ${data.overall_rating === 'green' ? 'border-[#00A699]' : data.overall_rating === 'red' ? 'border-[#FF5A5F]' : 'border-[#FFA500]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-3xl">{getRatingEmoji(data.overall_rating)}</span>
            <h3 className="text-xl font-bold text-[#484848]">Gesamturteil</h3>
          </div>
          <p className="text-gray-800 font-medium">{data.overall_summary}</p>
        </div>

        {/* Verhandlungspreis */}
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-[#484848] mb-4">Empfohlener Verhandlungspreis (Top-Deal)</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Angebotspreis laut Exposé</div>
              <div className="text-2xl font-semibold text-gray-900">
                {data.asking_price.toLocaleString('de-DE')} €
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Top-Deal-Preis</div>
              <div className="text-2xl font-semibold text-[#00A699]">
                {data.recommended_price.toLocaleString('de-DE')} €
              </div>
              <div className="text-sm text-[#FF5A5F] font-medium mt-1">
                ≈ {data.discount_percentage.toFixed(1)}% unter Angebotspreis
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg">
            <div className="text-sm font-medium text-gray-600 mb-2">Begründung</div>
            <p className="text-gray-700">{data.price_justification}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

interface Criterion {
  code: string;
  text: string;
}

interface AssessmentCriteriaProps {
  lessonTitle: string;
  criteria: Criterion[];
}

export function AssessmentCriteria({ lessonTitle, criteria }: AssessmentCriteriaProps) {
  if (criteria.length === 0) {
    return null;
  }

  return (
    <div className="print-section">
      <h2 className="text-xl font-bold mb-4">OCN Assessment Criteria</h2>
      <p className="text-sm text-gray-600 mb-4">Covered in: {lessonTitle}</p>

      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-3 py-2 text-left w-24">Code</th>
            <th className="border border-gray-300 px-3 py-2 text-left">Criterion</th>
            <th className="border border-gray-300 px-3 py-2 text-center w-20">Covered</th>
          </tr>
        </thead>
        <tbody>
          {criteria.map((criterion) => (
            <tr key={criterion.code}>
              <td className="border border-gray-300 px-3 py-2 font-mono text-purple-700">
                {criterion.code}
              </td>
              <td className="border border-gray-300 px-3 py-2">{criterion.text}</td>
              <td className="border border-gray-300 px-3 py-2 text-center">
                <div className="w-5 h-5 border border-gray-400 mx-auto" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 text-xs text-gray-500">
        Check box when criterion has been covered during the session
      </div>
    </div>
  );
}

'use client';

interface Learner {
  id: string;
  firstName: string;
  lastName: string;
}

interface AttendanceRegisterProps {
  cohortName: string;
  cohortCode: string;
  lessonTitle: string;
  sessionDate: string;
  learners: Learner[];
}

export function AttendanceRegister({
  cohortName,
  cohortCode,
  lessonTitle,
  sessionDate,
  learners,
}: AttendanceRegisterProps) {
  return (
    <div className="print-section">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold">Attendance Register</h2>
        <p className="text-[var(--text-secondary)]">{cohortName} ({cohortCode})</p>
      </div>

      <div className="mb-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <strong>Session:</strong> {lessonTitle}
          </div>
          <div>
            <strong>Date:</strong> {sessionDate}
          </div>
        </div>
      </div>

      <table className="w-full border-collapse border border-[var(--border)] text-sm">
        <thead>
          <tr className="bg-[var(--surface-hover)]">
            <th className="border border-[var(--border)] px-3 py-2 text-left w-8">#</th>
            <th className="border border-[var(--border)] px-3 py-2 text-left">Learner Name</th>
            <th className="border border-[var(--border)] px-3 py-2 text-center w-20">Present</th>
            <th className="border border-[var(--border)] px-3 py-2 text-center w-20">Late</th>
            <th className="border border-[var(--border)] px-3 py-2 text-center w-20">Absent</th>
            <th className="border border-[var(--border)] px-3 py-2 text-left w-32">Arrival Time</th>
            <th className="border border-[var(--border)] px-3 py-2 text-left">Signature</th>
          </tr>
        </thead>
        <tbody>
          {learners.map((learner, index) => (
            <tr key={learner.id}>
              <td className="border border-[var(--border)] px-3 py-3 text-center">{index + 1}</td>
              <td className="border border-[var(--border)] px-3 py-3">
                {learner.firstName} {learner.lastName}
              </td>
              <td className="border border-[var(--border)] px-3 py-3 text-center">
                <div className="w-5 h-5 border border-[var(--border)] mx-auto" />
              </td>
              <td className="border border-[var(--border)] px-3 py-3 text-center">
                <div className="w-5 h-5 border border-[var(--border)] mx-auto" />
              </td>
              <td className="border border-[var(--border)] px-3 py-3 text-center">
                <div className="w-5 h-5 border border-[var(--border)] mx-auto" />
              </td>
              <td className="border border-[var(--border)] px-3 py-3" />
              <td className="border border-[var(--border)] px-3 py-3" />
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <p className="mb-1"><strong>Instructor Name:</strong></p>
          <div className="border-b border-[var(--border)] h-6" />
        </div>
        <div>
          <p className="mb-1"><strong>Instructor Signature:</strong></p>
          <div className="border-b border-[var(--border)] h-6" />
        </div>
      </div>

      <div className="mt-4 text-sm">
        <p><strong>Notes:</strong></p>
        <div className="border border-[var(--border)] h-20 mt-1" />
      </div>
    </div>
  );
}

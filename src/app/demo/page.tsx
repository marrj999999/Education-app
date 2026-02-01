'use client';

import { useState } from 'react';
import Link from 'next/link';
import type {
  ContentSection,
  TimelineSection,
  ChecklistSection,
  SafetySection,
  TeachingStepSection,
  CheckpointSection,
  OutcomesSection,
  VocabularySection,
  ResourceSection,
  ProseSection,
  HeadingSection,
} from '@/lib/types/content';
import { SectionRenderer } from '@/components/sections';
import {
  PrepChecklist,
  TimelineOverview,
  SafetySummary,
  ResourcesList,
} from '@/components/prep';
import {
  SafetyBar,
  SectionStepper,
  SectionNavigator,
  CurrentSection,
  CheckpointPanel,
} from '@/components/teaching';
import { isChecklistSection, isTimelineSection, isSafetySection, isResourceSection, isCheckpointSection } from '@/lib/types/content';

// Mock data for demonstration
const mockSections: ContentSection[] = [
  {
    id: 'heading-1',
    type: 'heading',
    level: 1,
    text: 'Building a Bamboo Bicycle Frame',
  } as HeadingSection,

  {
    id: 'outcomes-1',
    type: 'outcomes',
    title: 'Learning Outcomes',
    items: [
      'Understand the properties of bamboo as a frame material',
      'Learn proper joint preparation techniques',
      'Master the fibre wrapping process',
      'Apply safety protocols in the workshop',
    ],
  } as OutcomesSection,

  {
    id: 'safety-1',
    type: 'safety',
    level: 'critical',
    title: 'Eye Protection Required',
    content: 'Always wear safety glasses when cutting bamboo. Bamboo can splinter unexpectedly and send sharp fragments flying.',
  } as SafetySection,

  {
    id: 'safety-2',
    type: 'safety',
    level: 'warning',
    title: 'Dust Hazard',
    content: 'Use dust extraction or wear a dust mask when sanding. Bamboo dust can cause respiratory irritation.',
  } as SafetySection,

  {
    id: 'safety-3',
    type: 'safety',
    level: 'caution',
    content: 'Handle epoxy resin with care - use gloves and work in a well-ventilated area.',
  } as SafetySection,

  {
    id: 'timeline-1',
    type: 'timeline',
    title: 'Session Schedule',
    rows: [
      { time: '09:00', activity: 'Introduction and safety briefing', duration: '30 mins', notes: 'All participants' },
      { time: '09:30', activity: 'Bamboo selection and preparation', duration: '45 mins' },
      { time: '10:15', activity: 'Break', duration: '15 mins' },
      { time: '10:30', activity: 'Joint cutting demonstration', duration: '30 mins' },
      { time: '11:00', activity: 'Hands-on cutting practice', duration: '60 mins' },
      { time: '12:00', activity: 'Lunch', duration: '60 mins' },
      { time: '13:00', activity: 'Fibre wrapping technique', duration: '90 mins' },
      { time: '14:30', activity: 'Review and cleanup', duration: '30 mins' },
    ],
  } as TimelineSection,

  {
    id: 'checklist-1',
    type: 'checklist',
    category: 'materials',
    title: 'Materials Needed',
    items: [
      { text: 'Bamboo poles (treated)', quantity: '4' },
      { text: 'Hemp fibre', quantity: '500g' },
      { text: 'Epoxy resin', quantity: '1L' },
      { text: 'Hardener', quantity: '500ml' },
      { text: 'Mixing cups', quantity: '10' },
    ],
  } as ChecklistSection,

  {
    id: 'checklist-2',
    type: 'checklist',
    category: 'tools',
    title: 'Tools Required',
    items: [
      { text: 'Japanese pull saw', quantity: '4' },
      { text: 'Measuring tape' },
      { text: 'Marking pencil' },
      { text: 'Clamps (various sizes)', quantity: '12' },
      { text: 'Sandpaper (80, 120, 240 grit)' },
    ],
  } as ChecklistSection,

  {
    id: 'checklist-3',
    type: 'checklist',
    category: 'equipment',
    title: 'Equipment',
    items: [
      { text: 'Safety glasses', quantity: '8' },
      { text: 'Dust masks', quantity: '8' },
      { text: 'Nitrile gloves (box)' },
      { text: 'First aid kit' },
    ],
  } as ChecklistSection,

  {
    id: 'heading-2',
    type: 'heading',
    level: 2,
    text: 'Step-by-Step Instructions',
  } as HeadingSection,

  {
    id: 'step-1',
    type: 'teaching-step',
    stepNumber: 1,
    title: 'Measure and Mark',
    instruction: 'Measure the bamboo pole and mark the cutting points using the marking pencil. Double-check all measurements before cutting.',
    duration: '10 mins',
    tips: [
      'Use the template for consistent measurements',
      'Mark clearly on all sides of the bamboo',
    ],
  } as TeachingStepSection,

  {
    id: 'step-2',
    type: 'teaching-step',
    stepNumber: 2,
    title: 'Secure the Bamboo',
    instruction: 'Place the bamboo in the cutting jig and secure firmly with clamps. Ensure it cannot rotate during cutting.',
    duration: '5 mins',
    warnings: [
      'Check clamp tightness before cutting',
    ],
  } as TeachingStepSection,

  {
    id: 'step-3',
    type: 'teaching-step',
    stepNumber: 3,
    title: 'Make the Cut',
    instruction: 'Using the Japanese pull saw, make slow, controlled cuts along the marked lines. Let the saw do the work - do not force it.',
    duration: '15 mins',
    tips: [
      'Pull the saw towards you with light pressure',
      'Support the off-cut to prevent splintering',
    ],
    warnings: [
      'Keep fingers clear of the blade path',
      'Wear safety glasses at all times',
    ],
  } as TeachingStepSection,

  {
    id: 'checkpoint-1',
    type: 'checkpoint',
    title: 'Quality Checkpoint',
    items: [
      { criterion: 'All cuts are clean with no splintering', description: 'Check both ends of each cut' },
      { criterion: 'Measurements match the template within 2mm tolerance' },
      { criterion: 'Safety equipment was worn throughout' },
      { criterion: 'Workspace is tidy and tools are returned' },
    ],
  } as CheckpointSection,

  {
    id: 'vocab-1',
    type: 'vocabulary',
    terms: [
      { term: 'Internode', definition: 'The section of bamboo between two nodes (joints)' },
      { term: 'Node', definition: 'The solid joint where branches and leaves emerge' },
      { term: 'Culm', definition: 'The main stem of the bamboo plant' },
      { term: 'Fibre wrapping', definition: 'The technique of wrapping hemp fibre soaked in epoxy around joints' },
    ],
  } as VocabularySection,

  {
    id: 'resource-1',
    type: 'resource',
    resourceType: 'pdf',
    url: 'https://example.com/bamboo-cutting-guide.pdf',
    title: 'Bamboo Cutting Reference Guide',
    caption: 'Print this guide for reference during the session',
  } as ResourceSection,

  {
    id: 'resource-2',
    type: 'resource',
    resourceType: 'video',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    title: 'Joint Preparation Tutorial',
    caption: 'Watch before the hands-on session',
  } as ResourceSection,

  {
    id: 'prose-1',
    type: 'prose',
    content: 'Bamboo has been used in construction for thousands of years due to its remarkable strength-to-weight ratio. When properly treated and joined, bamboo bicycle frames can match or exceed the performance of traditional materials.\n\n> "Bamboo is not just a material - it\'s a philosophy of sustainable engineering." — James Marr, Bamboo Bicycle Club',
  } as ProseSection,
];

export default function DemoPage() {
  const [viewMode, setViewMode] = useState<'prep' | 'teach'>('prep');
  const [currentIndex, setCurrentIndex] = useState(0);

  const demoLessonId = 'demo-lesson';

  // Filter sections by type for prep mode
  const checklists = mockSections.filter(isChecklistSection);
  const timelines = mockSections.filter(isTimelineSection);
  const safety = mockSections.filter(isSafetySection);
  const resources = mockSections.filter(isResourceSection);
  const checkpoints = mockSections.filter(isCheckpointSection);
  const criticalSafety = safety.filter((s) => s.level === 'critical');

  // Navigation for teach mode
  const goToPrevious = () => setCurrentIndex((prev) => Math.max(0, prev - 1));
  const goToNext = () => setCurrentIndex((prev) => Math.min(mockSections.length - 1, prev + 1));

  const getSectionLabel = (section: ContentSection): string => {
    if ('title' in section && section.title) return section.title as string;
    if (section.type === 'heading' && 'text' in section) return section.text as string;
    if (section.type === 'teaching-step' && 'stepNumber' in section) return `Step ${section.stepNumber}`;
    return section.type.replace('-', ' ');
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mode Toggle Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="text-gray-600 hover:text-gray-900 text-sm"
              >
                ← Back to Home
              </Link>
              <h1 className="text-lg font-bold text-gray-900">Component Demo</h1>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('prep')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'prep'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Prep Mode
              </button>
              <button
                onClick={() => setViewMode('teach')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'teach'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Teach Mode
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Prep Mode View */}
      {viewMode === 'prep' && (
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Safety Summary */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">SafetySummary Component</h2>
              <SafetySummary sections={safety} />
            </section>

            {/* Timeline Overview */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">TimelineOverview Component</h2>
              <TimelineOverview sections={timelines} />
            </section>

            {/* Prep Checklist */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">PrepChecklist Component</h2>
              <PrepChecklist sections={checklists} lessonId={demoLessonId} />
            </section>

            {/* Resources List */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">ResourcesList Component</h2>
              <ResourcesList sections={resources} lessonId={demoLessonId} />
            </section>

            {/* Individual Section Renderers */}
            <section>
              <h2 className="text-lg font-semibold text-gray-700 mb-4">Individual Section Renderers</h2>
              <div className="space-y-6">
                {mockSections.map((section) => (
                  <div key={section.id} className="bg-white rounded-lg shadow-sm p-6">
                    <p className="text-xs text-gray-400 mb-3 font-mono">
                      type: {section.type}
                    </p>
                    <SectionRenderer
                      section={section}
                      lessonId={demoLessonId}
                      variant="compact"
                    />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </main>
      )}

      {/* Teach Mode View */}
      {viewMode === 'teach' && (
        <div className="flex flex-col min-h-[calc(100vh-60px)]">
          {/* Safety Bar */}
          {criticalSafety.length > 0 && (
            <SafetyBar criticalSafety={criticalSafety} />
          )}

          {/* Section Stepper */}
          <div className="bg-white border-b border-gray-200">
            <SectionStepper
              sections={mockSections}
              currentIndex={currentIndex}
              onNavigate={setCurrentIndex}
            />
          </div>

          {/* Current Section */}
          <main className="flex-1 pb-24">
            <CurrentSection
              section={mockSections[currentIndex]}
              lessonId={demoLessonId}
            />
          </main>

          {/* Checkpoint Panel */}
          {checkpoints.length > 0 && (
            <CheckpointPanel checkpoints={checkpoints} lessonId={demoLessonId} />
          )}

          {/* Navigation */}
          <SectionNavigator
            onPrevious={goToPrevious}
            onNext={goToNext}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex < mockSections.length - 1}
            currentLabel={getSectionLabel(mockSections[currentIndex])}
          />
        </div>
      )}
    </div>
  );
}

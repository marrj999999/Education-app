import { NextResponse } from 'next/server';
import { getLessonContent } from '@/lib/notion';
import { parseNotionBlocks } from '@/lib/notion/parser';
import { applyCustomSectionOrder } from '@/lib/section-ordering';

interface RouteParams {
  params: Promise<{
    lessonId: string;
  }>;
}

export async function GET(request: Request, { params }: RouteParams) {
  const { lessonId } = await params;

  try {
    const lessonData = await getLessonContent(lessonId);

    if (!lessonData) {
      return NextResponse.json(
        { error: 'Lesson not found' },
        { status: 404 }
      );
    }

    const { page, blocks } = lessonData;
    const sections = parseNotionBlocks(blocks);

    // Apply custom section order if one exists (overlay on Notion order)
    const orderedSections = await applyCustomSectionOrder(lessonId, sections);

    return NextResponse.json({
      page: {
        title: page.title,
        icon: page.icon,
      },
      sections: orderedSections,
    });
  } catch (error) {
    console.error('Failed to fetch lesson sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch lesson' },
      { status: 500 }
    );
  }
}

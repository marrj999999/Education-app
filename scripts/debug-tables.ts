import { Client } from '@notionhq/client';
import type { NotionBlock } from '../src/lib/types';
import { detectTableType } from '../src/lib/notion/parser-utils';

const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

async function fetchPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of response.results) {
      if ('type' in block) {
        const notionBlock = block as unknown as NotionBlock;
        if (notionBlock.has_children) {
          notionBlock.children = await fetchPageBlocks(notionBlock.id);
        }
        blocks.push(notionBlock);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return blocks;
}

async function debugTables() {
  const lessonId = process.argv[2];

  if (!lessonId || !process.env.NOTION_API_KEY) {
    console.error('Usage: source .env.local && npx tsx scripts/debug-tables.ts <lessonId>');
    process.exit(1);
  }

  const blocks = await fetchPageBlocks(lessonId);

  console.log('\n=== TABLE ANALYSIS ===\n');

  const tables = blocks.filter(b => b.type === 'table');

  tables.forEach((table, tableIndex) => {
    console.log(`\n--- Table ${tableIndex + 1} ---`);
    console.log(`Has children: ${table.has_children}`);
    console.log(`Children count: ${table.children?.length || 0}`);

    if (!table.children || table.children.length === 0) {
      console.log('⚠️ No children found!');
      return;
    }

    const rows = table.children.filter(c => c.type === 'table_row');
    console.log(`Rows found: ${rows.length}`);

    if (rows.length === 0) {
      console.log('⚠️ No table_row children!');
      return;
    }

    // Get headers from first row
    const firstRow = rows[0];
    if (!firstRow.table_row?.cells) {
      console.log('⚠️ First row has no cells!');
      return;
    }

    const headers = firstRow.table_row.cells.map(cell =>
      cell.map(rt => rt.plain_text).join('')
    );

    console.log(`Headers: ${JSON.stringify(headers)}`);

    const tableType = detectTableType(headers);
    console.log(`Detected type: ${tableType}`);

    // Show first data row
    if (rows.length > 1) {
      const dataRow = rows[1];
      if (dataRow.table_row?.cells) {
        const dataCells = dataRow.table_row.cells.map(cell =>
          cell.map(rt => rt.plain_text).join('')
        );
        console.log(`First data row: ${JSON.stringify(dataCells)}`);
      }
    }
  });

  // Also check what headings precede to_do blocks
  console.log('\n\n=== TO_DO BLOCK ANALYSIS ===\n');

  let lastHeading = '';
  blocks.forEach((block, i) => {
    if (block.type.startsWith('heading_')) {
      const headingType = block.type as 'heading_1' | 'heading_2' | 'heading_3';
      const headingContent = block[headingType] as { rich_text: Array<{ plain_text: string }> } | undefined;
      lastHeading = headingContent?.rich_text?.map(rt => rt.plain_text).join('') || '';
    }

    if (block.type === 'to_do') {
      const text = block.to_do?.rich_text?.map((rt: any) => rt.plain_text).join('') || '';
      console.log(`[${i}] to_do after "${lastHeading}": "${text.substring(0, 50)}..."`);
    }
  });
}

debugTables();

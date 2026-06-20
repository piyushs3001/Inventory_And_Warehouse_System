import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from './reports.service';
import { ReportDto } from './dto/report.dto';

describe('ReportsService.toCsv (formula-injection hardening)', () => {
  const service = new ReportsService({} as unknown as PrismaService);

  function csv(rows: Record<string, string | number>[]): string {
    const report: ReportDto = {
      type: 'inventory',
      generatedAt: new Date(0),
      columns: [{ key: 'name', label: 'Name', numeric: false }],
      rows,
      summary: {},
    };
    return service.toCsv(report);
  }

  it('prefixes cells that start with a formula trigger so they cannot execute', () => {
    const out = csv([
      { name: '=SUM(A1:A2)' },
      { name: '+1' },
      { name: '-1' },
      { name: '@cmd' },
    ]);
    const lines = out.split('\n');
    // Each dangerous cell is apostrophe-prefixed; commas/quotes still escaped.
    expect(lines[1]).toBe("'=SUM(A1:A2)");
    expect(lines[2]).toBe("'+1");
    expect(lines[3]).toBe("'-1");
    expect(lines[4]).toBe("'@cmd");
  });

  it('leaves benign cells untouched but still escapes commas/quotes', () => {
    const out = csv([{ name: 'Cola, 330ml' }, { name: 'Plain' }]);
    const lines = out.split('\n');
    expect(lines[1]).toBe('"Cola, 330ml"');
    expect(lines[2]).toBe('Plain');
  });
});

import ExcelJS from 'exceljs';
import { FinancialStatement, RatioResult, ReportNode } from '../../shared/types';
import { formatINR } from '../../shared/money';

/** Flatten a report node tree into indented rows (label, amount, level). */
function flatten(nodes: ReportNode[], acc: ReportNode[] = []): ReportNode[] {
  for (const n of nodes) {
    acc.push(n);
    if (n.children) flatten(n.children, acc);
  }
  return acc;
}

/** Export one or more financial statements to a styled .xlsx workbook buffer. */
export async function exportStatementsToXlsx(
  statements: FinancialStatement[],
  ratios?: RatioResult[],
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'GeniusAI Infinity Accounting';
  wb.created = new Date();

  for (const st of statements) {
    const ws = wb.addWorksheet(st.title.slice(0, 28));
    ws.columns = [
      { header: 'Particulars', key: 'label', width: 55 },
      { header: 'Note', key: 'note', width: 8 },
      { header: `As at ${st.toDate}`, key: 'amount', width: 22 },
    ];

    ws.mergeCells('A1:C1');
    ws.getCell('A1').value = st.companyName;
    ws.getCell('A1').font = { bold: true, size: 14 };
    ws.mergeCells('A2:C2');
    ws.getCell('A2').value = `${st.title} (${st.division === 'DIV_II' ? 'Division II — Ind AS' : 'Division I — IGAAP'})`;
    ws.getCell('A2').font = { italic: true, size: 11 };
    ws.addRow([]);

    const headerRow = ws.addRow(['Particulars', 'Note', `As at ${st.toDate}`]);
    headerRow.font = { bold: true };
    headerRow.eachCell((c) => {
      c.border = { bottom: { style: 'thin' } };
    });

    for (const n of flatten(st.nodes)) {
      const row = ws.addRow([
        '   '.repeat(n.level) + n.label,
        n.noteRef ?? '',
        formatINR(n.amount, { showZero: true }),
      ]);
      row.getCell(3).alignment = { horizontal: 'right' };
      if (n.level === 0 && n.children) row.font = { bold: true };
    }

    ws.addRow([]);
    const total = ws.addRow(['TOTAL', '', formatINR(st.total, { showZero: true })]);
    total.font = { bold: true };
    total.getCell(3).alignment = { horizontal: 'right' };
    total.eachCell((c) => { c.border = { top: { style: 'thin' }, bottom: { style: 'double' } }; });
  }

  if (ratios?.length) {
    const ws = wb.addWorksheet('Statutory Ratios');
    ws.columns = [
      { header: 'Ratio', key: 'name', width: 40 },
      { header: 'Value', key: 'value', width: 14 },
      { header: 'Formula', key: 'formula', width: 55 },
    ];
    ws.getRow(1).font = { bold: true };
    for (const r of ratios) ws.addRow([r.name, r.value, r.formula]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

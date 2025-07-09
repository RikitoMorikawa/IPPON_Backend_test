import { Workbook, Worksheet } from 'exceljs';
import * as reportService from './reportService';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { ReportErrors } from '@src/responses/reportResponse';
import { Report } from '@src/models/report';
import { ExcelFormattedReport } from '@src/interfaces/reportInterfaces';

// Excel生成メイン関数
export async function generateReportExcel(
    reportId: string,
    clientId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<Buffer> {
    const reportData = await getReportData(reportId, clientId, ddbDocClient);

    const workbook = new Workbook();
    const worksheet = workbook.addWorksheet('販売状況報告書');

    worksheet.pageSetup = {
        paperSize: 9, // A4
        orientation: 'portrait',
        margins: {
            left: 0.7,
            right: 0.7,
            top: 0.75,
            bottom: 0.75,
            header: 0.3,
            footer: 0.3,
        },
    };

    // Column width settings (Columns A to AB, 28 columns)
    const columnWidths = [
        4, // A: For number
        4, // B: For date
        4, // C: Response source
        4, // D: Status
        4, // E: Progress record (main)
        4, // F:
        4, // G:
        4, // H:
        4, // I:
        4, // J:
        4, // K:
        4, // L:
        4, // M:
        4, // N:
        4, // O:
        4, // P:
        4, // Q:
        4, // R:
        4, // S:
        4, // T:
        4, // U:
        4, // V:
        4, // W:
        4, // X:
        4, // Y: Company name area
        4, // Z: Agent name area
        4, // AA:
        4, // AB:
    ];

    worksheet.columns = columnWidths.map((width) => ({ width }));

    let currentRow = 1;

    // Header section
    currentRow = createHeader(worksheet, reportData, currentRow);

    // Sales status section (Reflects UI screen statistics)
    currentRow = createSalesStatusSection(worksheet, reportData, currentRow);

    // Overall report section (UI screen overall report)
    currentRow = createOverallReportSection(worksheet, reportData, currentRow);

    // Visit details section
    // currentRow = createVisitDetailsSection(worksheet, reportData, currentRow);

    // Inquiry history section (Based on UI screen history table)
    currentRow = createInquiryHistorySection(worksheet, reportData, currentRow);

    // Activity report section
    // createActivityReportSection(worksheet, reportData, currentRow);

    // Output Excel file as a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer as unknown as Buffer;
}

// DynamoDBからデータ取得
async function getReportData(
    reportId: string,
    clientId: string,
    ddbDocClient: DynamoDBDocumentClient,
): Promise<any> {
    // Get actual report data with all combined data
    const report = await reportService.getReportDetailsWithAllData(reportId, clientId, ddbDocClient);

    if (!report) {
        throw ReportErrors.reportNotFound({ report_id: reportId });
    }

    // Cast to any type to avoid type errors
    // TODO: types should be defined
    const reportAny = report as any;

    console.log("reportAny", reportAny)

    // Map data to UI screen items
    return {
        // Basic information (UI screen base)
        reportId: reportAny.report_id,
        reportDate: formatJapaneseDate(reportAny.report_date || ''),



        // Basic information (UI screen base)
        propertyName: reportAny.property?.name || '', // Property name
        reportTitle: reportAny.report_name || reportAny.property?.name || '', // Report title
        clientName: reportAny.client_data?.client_name || '', // Client name from PostgreSQL
        companyName: reportAny.client_data?.client_name || '', // Company name from PostgreSQL
        agentName: reportAny.client_data?.agent_name || '', // Agent name from PostgreSQL

        // Period (UI screen period field)
        activityPeriod: {
            start: reportAny.report_start_date ? formatDate(reportAny.report_start_date) : '',
            end: reportAny.report_end_date ? formatDate(reportAny.report_end_date) : '',
        },

        // Overall report (UI screen overall report section)
        overallReport: reportAny.summary || '',

        // Statistics (UI screen statistics information)
        statistics: {
            // Total overview
            totalOverview: `Total number (${reportAny.viewing_count || 0}/${reportAny.inquiries_count || 0})`,

            // Inquiry to SUUMO
            isSuumoPublished: reportAny.is_suumo_published || false,

            // Views
            views: reportAny.views_count || 0,

            // Inquiries
            inquiries: reportAny.inquiries_count || 0,

            // Business meeting count
            businessMeetingCount: reportAny.business_meeting_count || 0,

            // Viewing count
            viewingCount: reportAny.viewing_count || 0,
        },

        // History table (UI screen history table)
        customerInteractions: (reportAny.customer_interactions || []).map((interaction: any) => ({
            // Date
            date: formatDate(interaction.date || ''),

            // Title
            title: interaction.title || '',

            // Customer name
            customerName: interaction.customer_name || '',

            // Category
            category: interaction.category || '',

            // Content
            content: interaction.content || '',
        })),

        // Legacy property report data
        propertyPrice: reportAny.property?.price || 0,
        saleStartDate: formatDate(reportAny.property?.sales_start_date || ''),

        // Inquiry history (table data) - Legacy format
        inquiryHistory: (reportAny.customer_interactions || []).map((interaction: any) => ({
            date: formatShortDate(interaction.date || ''),
            source:
                interaction.customer_name?.includes('個人') || interaction.content?.includes('個人')
                    ? '個人'
                    : '不動産業者',
            status: interaction.category === '内見' ? '案内済み' : '資料提供',
            details: interaction.content || '',
        })),

        // Visit details - Legacy format
        visitDetails: (reportAny.customer_interactions || [])
            .filter((interaction: any) => interaction.category === '内見')
            .map((interaction: any) => ({
                date: formatJapaneseDate(interaction.date || ''),
                description: interaction.content || '',
            })),

        // Other
        currentStatus: reportAny.current_status || '募集中',
        title: reportAny.report_name || '販売状況報告書',
        isDraft: reportAny.publish_status === 'draft',

        // Property owner information
        ownerName: reportAny.property?.owner_last_name && reportAny.property?.owner_first_name 
            ? `${reportAny.property.owner_last_name}${reportAny.property.owner_first_name}`
            : '',
    };
}

// Date format function
function formatJapaneseDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
}

function formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
}

function formatShortDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}/${day}`;
}

// Create header
function createHeader(worksheet: Worksheet, data: any, startRow: number): number {
    let row = startRow;

    // Date (top right) - Black text
    worksheet.getCell(`N${row}`).value = data.reportDate;
    worksheet.getCell(`N${row}`).font = { size: 11, color: { argb: '000000' } };
    worksheet.getCell(`N${row}`).alignment = { horizontal: 'right' };
    row++;

    // Title (center, 2nd row) - Bold and orange
    worksheet.getCell(`A${row}`).value = '販売状況報告書';
    worksheet.getCell(`A${row}`).font = { size: 14, bold: true, color: { argb: '000000' } };
    worksheet.getCell(`A${row}`).alignment = { horizontal: 'center' };
    worksheet.mergeCells(`A${row}:N${row}`);
    row++;

    // Client name (3rd row) - Bold and black
    const displayName = data.ownerName ? `${data.ownerName}様` : (data.clientName ? `${data.clientName}様` : '');
    worksheet.getCell(`A${row}`).value = displayName;
    worksheet.getCell(`A${row}`).font = { size: 12, bold: true, color: { argb: '000000' } }; // Black color
    row += 2;

    // Company name & agent name (right side, ending at N)
    worksheet.getCell(`G${row}`).value = data.companyName;
    worksheet.getCell(`G${row}`).font = { size: 11, color: { argb: '000000' } };
    worksheet.getCell(`G${row}`).alignment = { horizontal: 'right' };
    worksheet.mergeCells(`G${row}:N${row}`);

    worksheet.getCell(`G${row + 1}`).value = data.agentName;
    worksheet.getCell(`G${row + 1}`).font = { size: 11, color: { argb: '000000' } };
    worksheet.getCell(`G${row + 1}`).alignment = { horizontal: 'right' };
    worksheet.mergeCells(`G${row + 1}:N${row + 1}`);
    row += 2;

    // Add one empty row above property name
    row++;

    // Property name
    worksheet.getCell(`A${row}`).value = `物件名：${data.propertyName}`;
    worksheet.getCell(`A${row}`).font = { size: 11, bold: true, color: { argb: '000000' } };
    row += 2;

    // Greeting
    worksheet.getCell(`A${row}`).value = '拝啓　時下ますますご清栄のこととお喜び申し上げます。';
    worksheet.getCell(`A${row}`).font = { size: 10 };
    worksheet.mergeCells(`A${row}:Z${row}`);
    row++;

    worksheet.getCell(`A${row}`).value =
        '早速ではございますが、専任媒介契約書にもとづき下記の通りご報告申し上げますので、';
    worksheet.getCell(`A${row}`).font = { size: 10 };
    worksheet.mergeCells(`A${row}:Z${row}`);
    row++;

    worksheet.getCell(`A${row}`).value = 'ご査収くださいますようお願い申し上げます。 敬具';
    worksheet.getCell(`A${row}`).font = { size: 10 };
    worksheet.mergeCells(`A${row}:Z${row}`);
    row += 2;

    return row;
}

// Sales status section (Reflects UI screen statistics)
function createSalesStatusSection(worksheet: Worksheet, data: any, startRow: number): number {
    let row = startRow;

    // Section title - Bold and orange
    const priceFormatted = `${(data.propertyPrice / 10000).toLocaleString()}万円`;
    worksheet.getCell(`A${row}`).value = {
        richText: [
            { text: '（1）販売状況について （当初売出価格：', font: { color: { argb: 'FF000000' }, bold: true } },
            { text: priceFormatted, font: { color: { argb: 'FF000000' } } }, // Black
            { text: '　売出開始日：', font: { color: { argb: 'FF000000' }, bold: true } },
            { text: data.saleStartDate, font: { color: { argb: 'FF000000' } } }, // Black
            { text: '）', font: { color: { argb: 'FF000000' } } }
        ]
    };

    worksheet.getCell(`A${row}`).font = { size: 11, bold: true }; // Font size and bold for all
    worksheet.mergeCells(`A${row}:AB${row}`);
    row += 2;

    // Activity period (UI screen period) - indented to column B
    worksheet.getCell(`B${row}`).value = '活動期間：';
    worksheet.getCell(`D${row}`).value = `${data.activityPeriod.start} ～ ${data.activityPeriod.end}`;
    worksheet.getCell(`B${row}`).font = { size: 10 };
    worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for dates
    row++;

    // Inquiries (UI screen inquiries) - indented to column B
    worksheet.getCell(`B${row}`).value = 'お問い合わせ件数：';
    worksheet.getCell(`D${row}`).value = `${data.statistics.inquiries} 件`;
    worksheet.getCell(`B${row}`).font = { size: 10 };
    worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for values
    row++;

    // Business meeting count (UI screen business meeting count) - indented to column B
    worksheet.getCell(`B${row}`).value = '期間内の商談実施人数：';
    worksheet.getCell(`D${row}`).value = `${data.statistics.businessMeetingCount} 件`;
    worksheet.getCell(`B${row}`).font = { size: 10 };
    worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for values
    row++;

    // Viewing count (UI screen viewing count) - indented to column B
    worksheet.getCell(`B${row}`).value = '期間内の物件見学人数：';
    worksheet.getCell(`D${row}`).value = `${data.statistics.viewingCount} 件`;
    worksheet.getCell(`B${row}`).font = { size: 10 };
    worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for values
    row++;

    // SUUMO-related rows - only show if SUUMO is published - indented to column B
    if (data.statistics.isSuumoPublished) {
        // SUUMOへの問合せ
        worksheet.getCell(`B${row}`).value = 'SUUMOへの問合せ：';
        worksheet.getCell(`D${row}`).value = '掲載済み';
        worksheet.getCell(`B${row}`).font = { size: 10, color: { argb: '000000' } };
        worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for values
        row++;

        // SUUMOの閲覧数
        worksheet.getCell(`B${row}`).value = 'SUUMOの閲覧数：';
        worksheet.getCell(`D${row}`).value = `${data.statistics.viewingCount} 件`;
        worksheet.getCell(`B${row}`).font = { size: 10, color: { argb: '000000' } };
        worksheet.getCell(`D${row}`).font = { size: 10, color: { argb: '000000' } }; // Black color for values
        row++;
    }

    row += 2;
    return row;
}

// Inquiry history section (UI screen history table)
function createInquiryHistorySection(worksheet: Worksheet, data: any, startRow: number): number {
    let row = startRow;

    // Section title - Bold and orange
    worksheet.getCell(`A${row}`).value = '（3）反響内容・経過記録';
    worksheet.getCell(`A${row}`).font = { size: 11, bold: true, color: { argb: '000000' } }; // Orange color
    worksheet.mergeCells(`A${row}:AB${row}`);
    row += 2;

    // Table header (UI screen history table)
    const headers = [
        { col: 'B', text: '日付' },
        { col: 'C', text: 'タイトル' },
        { col: 'D', text: '顧客名' },
        { col: 'E', text: 'カテゴリ' },
        { col: 'F', text: '内容' },
    ];

    worksheet.getColumn('B').width = 13;
    worksheet.getColumn('C').width = 13;
    worksheet.getColumn('D').width = 13;
    worksheet.getColumn('E').width = 13;
    // Set uniform width for F~N columns
    worksheet.getColumn('F').width = 4;
    worksheet.getColumn('G').width = 4;
    worksheet.getColumn('H').width = 4;
    worksheet.getColumn('I').width = 4;
    worksheet.getColumn('J').width = 4;
    worksheet.getColumn('K').width = 4;
    worksheet.getColumn('L').width = 4;
    worksheet.getColumn('M').width = 4;
    worksheet.getColumn('N').width = 4;

    headers.forEach((header) => {
        worksheet.getCell(`${header.col}${row}`).value = header.text;
        worksheet.getCell(`${header.col}${row}`).font = { size: 10, bold: true };
        worksheet.getCell(`${header.col}${row}`).alignment = {
            horizontal: 'center',
            vertical: 'middle',
        };
        worksheet.getCell(`${header.col}${row}`).border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
        };
        worksheet.getCell(`${header.col}${row}`).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFADD8E6' }, // Light blue background
        };
    });

    // Expand content column
    worksheet.mergeCells(`F${row}:N${row}`);
    row++;

    // Data rows (UI screen customerInteractions data)
    if (data.customerInteractions && data.customerInteractions.length > 0) {
        data.customerInteractions.forEach(
            (interaction: {
                date: string;
                title: string;
                customerName: string;
                category: string;
                content: string;
            }) => {
                worksheet.getCell(`B${row}`).value = interaction.date;
                worksheet.getCell(`C${row}`).value = interaction.title;
                worksheet.getCell(`D${row}`).value = interaction.customerName;
                worksheet.getCell(`E${row}`).value = interaction.category;
                worksheet.getCell(`F${row}`).value = interaction.content;

                // Style settings - 左寄せ・縦中央寄せ
                ['B', 'C', 'D', 'E'].forEach((col) => {
                    worksheet.getCell(`${col}${row}`).font = { size: 9, color: { argb: '000000' } };
                    worksheet.getCell(`${col}${row}`).alignment = { 
                        horizontal: 'left', 
                        vertical: 'middle', 
                        wrapText: true 
                    };
                    worksheet.getCell(`${col}${row}`).border = {
                        top: { style: 'thin' },
                        left: { style: 'thin' },
                        bottom: { style: 'thin' },
                        right: { style: 'thin' },
                    };
                });

                // 内容列（F列）は左寄せ、縦中央寄せ（読みやすさのため）
                worksheet.getCell(`F${row}`).font = { size: 9, color: { argb: '000000' } };
                worksheet.getCell(`F${row}`).alignment = { 
                    horizontal: 'left', 
                    vertical: 'middle', 
                    wrapText: true 
                };
                worksheet.getCell(`F${row}`).border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };

                // Expand content column
                worksheet.mergeCells(`F${row}:N${row}`);

                // Adjust row height based on content length with improved calculation
                const contentHeight = calculateRowHeight(interaction.content || '', 36); // 36文字/行でより正確に
                worksheet.getRow(row).height = contentHeight;
                row++;
            },
        );
    }

    // Add empty rows for hand-written use (8 rows)
    for (let i = 0; i < 8; i++) {
        ['B', 'C', 'D', 'E', 'F'].forEach((col) => {
            worksheet.getCell(`${col}${row}`).border = {
                top: { style: 'thin' },
                left: { style: 'thin' },
                bottom: { style: 'thin' },
                right: { style: 'thin' },
            };
        });
        worksheet.mergeCells(`F${row}:N${row}`);
        worksheet.getRow(row).height = 25;
        row++;
    }

    // Add 3 empty rows
    row += 3;

    // Add closing message (2 lines, A~M range)
    worksheet.getCell(`A${row}`).value = '以上、当該物件に関するご報告となります。ご確認のほど、よろしくお願いいたします。';
    worksheet.getCell(`A${row}`).font = { size: 10 };
    worksheet.mergeCells(`A${row}:M${row}`);
    row++;

    worksheet.getCell(`A${row}`).value = '引き続きどうぞよろしくお願いいたします。';
    worksheet.getCell(`A${row}`).font = { size: 10 };
    worksheet.mergeCells(`A${row}:M${row}`);
    row++;

    row += 2;
    return row;
}

// Overall report section (UI screen overall report)
function createOverallReportSection(worksheet: Worksheet, data: any, startRow: number): number {
    let row = startRow;

    // Section title - Bold and orange
    worksheet.getCell(`A${row}`).value = '（2）全体報告';
    worksheet.getCell(`A${row}`).font = { size: 11, bold: true, color: { argb: '000000' } }; // Orange color
    worksheet.mergeCells(`A${row}:AB${row}`);
    row += 2;

    // Overall report content - wrap text and merge cells for proper width - indented to column B
    const reportText = data.overallReport || '';
    const essayFormat = reportText ? summaryToEssayFormat(reportText) : '';

    worksheet.getCell(`B${row}`).value = essayFormat;
    worksheet.getCell(`B${row}`).font = { size: 10, color: { argb: '000000' } };
    worksheet.getCell(`B${row}`).alignment = { wrapText: true, vertical: 'top' };
    worksheet.mergeCells(`B${row}:N${row}`);

    // Dynamically calculate and set row height with improved calculation
    worksheet.getRow(row).height = calculateRowHeight(essayFormat, 50, 20, 15); // より広い幅でも計算

    row += 2; // Add spacing
    return row;
}

function estimateRowHeight(text: string, charsPerLine = 40, lineHeight = 15) {
    // Estimate how many lines the text will wrap into
    const lines = Math.ceil(text.length / charsPerLine);
    return Math.max(20, lines * lineHeight);
}

// より正確な行の高さ計算関数
function calculateRowHeight(text: string, charsPerLine = 36, baseHeight = 20, lineHeight = 16): number {
    if (!text || text.trim() === '') {
        return baseHeight;
    }

    // 改行がある場合は既存の改行も考慮
    const explicitLines = text.split('\n').length;
    
    // 文字数による自動改行を計算
    let totalLines = 0;
    text.split('\n').forEach(line => {
        if (line.trim() === '') {
            totalLines += 1; // 空行も1行として扱う
        } else {
            // 日本語文字と英数字を区別してより正確に計算
            const japaneseChars = (line.match(/[ひらがなカタカナ漢字ー]/g) || []).length;
            const otherChars = line.length - japaneseChars;
            
            // 日本語文字は英数字の約1.5倍の幅として計算
            const effectiveLength = japaneseChars * 1.5 + otherChars;
            const linesForThisText = Math.ceil(effectiveLength / charsPerLine);
            totalLines += Math.max(1, linesForThisText);
        }
    });

    // 最小高さを保証し、行数に応じて高さを調整
    const calculatedHeight = baseHeight + (totalLines - 1) * lineHeight;
    
    // 最小25px、最大200pxに制限
    return Math.min(200, Math.max(25, calculatedHeight));
}

function summaryToEssayFormat(summary: string): string {
    // Split into lines, trim, and filter out empty lines
    const lines = summary.split('\n').map(line => line.trim()).filter(line => line);

    if (lines.length === 0) return '';

    // The first line is the header
    const header = lines[0].replace(/。*$/, '') + '。';

    // Find the index of the first line that starts with '顧客' or similar (the essay tail)
    const tailIndex = lines.findIndex(line => line.startsWith('顧客'));

    // The bullet points are between the header and the tail
    const bulletLines = lines.slice(1, tailIndex === -1 ? undefined : tailIndex)
        .map(line => line.replace(/^・/, '').replace(/。*$/, '')) // Remove bullet and trailing period
        .filter(line => line);

    // Join bullet points with 、 and add a 。 at the end
    const bulletEssay = bulletLines.length > 0 ? bulletLines.join('、') + '。' : '';

    // The tail (if present)
    const tail = tailIndex !== -1 ? lines.slice(tailIndex).join('') : '';

    // Combine all parts
    return header + bulletEssay + tail;
}

// // // Visit details section
// function createVisitDetailsSection(worksheet: Worksheet, data: any, startRow: number): number {
//     let row = startRow;

//     // Section title - Bold and orange
//     worksheet.getCell(`A${row}`).value = '（3）案内状況・商談状況';
//     worksheet.getCell(`A${row}`).font = { size: 11, bold: true, color: { argb: 'FFFF8C00' } }; // Orange color
//     worksheet.mergeCells(`A${row}:AB${row}`);
//     row += 1;

//     // Visit details
//     if (data.visitDetails && data.visitDetails.length > 0) {
//         data.visitDetails.forEach((visit: { date: string; description: string }, index: number) => {
//             // Number
//             worksheet.getCell(`A${row}`).value = `${index + 1}`;
//             worksheet.getCell(`A${row}`).font = { size: 10, bold: true };
//             row++;

//             // Content
//             worksheet.getCell(`A${row}`).value = `${visit.date}　${visit.description}`;
//             worksheet.getCell(`A${row}`).font = { size: 10 };
//             worksheet.getCell(`A${row}`).alignment = { wrapText: true, vertical: 'top' };
//             worksheet.mergeCells(`A${row}:AB${row}`);

//             // Adjust row height
//             const textLength = visit.description.length;
//             worksheet.getRow(row).height = Math.max(30, Math.ceil(textLength / 100) * 15);
//             row += 2;
//         });
//     } else {
//         worksheet.getCell(`A${row}`).value = '現在、案内実績はありません。';
//         worksheet.getCell(`A${row}`).font = { size: 10 };
//         worksheet.mergeCells(`A${row}:AB${row}`);
//         row += 2;
//     }

//     return row;
// }

// Activity report section
// function createActivityReportSection(worksheet: Worksheet, data: any, startRow: number): number {
//     let row = startRow;

//     // Section title - Bold and orange
//     worksheet.getCell(`A${row}`).value = '（5）活動のご報告および、所見';
//     worksheet.getCell(`A${row}`).font = { size: 11, bold: true, color: { argb: 'FFFF8C00' } }; // Orange color
//     worksheet.mergeCells(`A${row}:AB${row}`);
//     row += 2;

//     // Report content
//     const reportText = `
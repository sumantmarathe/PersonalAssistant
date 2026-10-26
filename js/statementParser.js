/**
 * StatementParser - Client-Side Zero-Knowledge Bank Statement Parser
 * Supports CSV and PDF bank statements for HDFC, SBI, ICICI, Axis, and Universal formats.
 * 100% On-Device execution; zero network transmission.
 */

class StatementParser {
  constructor() {
    this.categoryRules = [
      { category: 'Food', regex: /\b(swiggy|zomato|mcdonald|starbucks|kfc|pizza|domino|burger|restaurant|cafe|eats|blinkit|zepto|instamart|bigbasket|grocer|food|bakery)\b/i },
      { category: 'Transportation', regex: /\b(uber|ola|rapido|fuel|petrol|diesel|iocl|bpcl|hpcl|shell|fastag|toll|railway|irctc|metro|flight|indigo|airindia|transport)\b/i },
      { category: 'Shopping', regex: /\b(amazon|flipkart|myntra|zara|h&m|ajio|tata\s*cliq|retail|store|mall|croma|reliance|shopping|lifestyle|trends)\b/i },
      { category: 'Utilities', regex: /\b(bescom|electricity|power|water|airtel|jio|vodafone|vi|broadband|wifi|billdesk|gas|lpg|cylinder|recharge|dth|tata\s*play)\b/i },
      { category: 'Housing', regex: /\b(rent|maintenance|society|landlord|housing|nobroker|nestaway|apartment)\b/i },
      { category: 'Health', regex: /\b(pharmacy|apollo|medplus|pharmeasy|1mg|hospital|clinic|doctor|dental|lab|diagnostic|healthcare|chemist)\b/i },
      { category: 'Entertainment', regex: /\b(netflix|prime\s*video|hotstar|spotify|cinema|pvr|inox|bookmyshow|youtube|gaming|playstation|disney)\b/i },
      { category: 'Salary', regex: /\b(salary|payroll|stipend|wages|remuneration|bonus)\b/i },
      { category: 'Investment', regex: /\b(zerodha|groww|upstox|mutual\s*fund|sip|dividend|interest|fd|fixed\s*deposit|nse|bse|sebi|kuvera)\b/i }
    ];
  }

  /**
   * Suggest category based on transaction description
   */
  suggestCategory(description, type) {
    if (!description) return type === 'income' ? 'Salary' : 'General';
    const text = description.toLowerCase();
    for (const rule of this.categoryRules) {
      if (rule.regex.test(text)) {
        return rule.category;
      }
    }
    return type === 'income' ? 'Other Income' : 'General';
  }

  /**
   * Parse Indian / International formatted currency strings into numbers
   */
  parseAmount(val) {
    if (typeof val === 'number') return Math.abs(val);
    if (!val || typeof val !== 'string') return 0;
    // Strip currency symbols, prefixes, commas, Dr/Cr suffixes, whitespace
    const cleaned = val.replace(/(?:₹|rs\.?|inr)\s*/gi, '').replace(/,/g, '').replace(/(?:\s*(?:dr|cr))$/i, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.abs(parsed);
  }

  /**
   * Normalizes diverse bank date strings into ISO YYYY-MM-DD
   */
  parseDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return new Date().toISOString().split('T')[0];
    const clean = dateStr.trim();

    // Months map for DD-MMM-YYYY (e.g. 15-Jan-2026 or 15/Oct/25)
    const monthMap = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
    };

    // 1. DD-MMM-YYYY or DD MMM YYYY or DD/MMM/YYYY
    const dMmmMatch = clean.match(/^(\d{1,2})[\s\/-]([A-Za-z]{3})[\s\/-](\d{2,4})$/);
    if (dMmmMatch) {
      let [, day, monStr, year] = dMmmMatch;
      const month = monthMap[monStr.toLowerCase().slice(0, 3)] || '01';
      if (year.length === 2) year = '20' + year;
      day = day.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 2. DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
    const dmyMatch = clean.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
    if (dmyMatch) {
      let [, day, month, year] = dmyMatch;
      if (year.length === 2) year = '20' + year;
      day = day.padStart(2, '0');
      month = month.padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    // 3. YYYY-MM-DD (ISO)
    const isoMatch = clean.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }

    return new Date().toISOString().split('T')[0];
  }

  /**
   * Parse CSV content with robust comma, quote, and newline handling
   */
  parseCSV(csvText) {
    if (!csvText || typeof csvText !== 'string') return [];

    const lines = [];
    let row = [];
    let cell = '';
    let inQuotes = false;

    // Normalize newlines
    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          cell += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        row.push(cell.trim());
        cell = '';
      } else if (char === '\n' && !inQuotes) {
        row.push(cell.trim());
        if (row.some(c => c.length > 0)) {
          lines.push(row);
        }
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell.length > 0 || row.length > 0) {
      row.push(cell.trim());
      if (row.some(c => c.length > 0)) lines.push(row);
    }

    if (lines.length < 2) return [];

    // Find Header Row: search top 25 rows
    let headerIdx = -1;
    let colMap = { date: -1, desc: -1, debit: -1, credit: -1, type: -1, amount: -1 };

    for (let r = 0; r < Math.min(lines.length, 25); r++) {
      const candidate = lines[r].map(c => c.toLowerCase());
      const dateCol = candidate.findIndex(c => /date|txn_date|txndate|value\s*date/i.test(c));
      const descCol = candidate.findIndex(c => /narration|description|particulars|remarks|details/i.test(c));
      const debitCol = candidate.findIndex(c => /\b(debit|withdrawal|dr|paid\s*out)\b/i.test(c) || c === 'dr');
      const creditCol = candidate.findIndex(c => /\b(credit|deposit|cr|paid\s*in)\b/i.test(c) || c === 'cr');
      const amountCol = candidate.findIndex(c => /\b(amount|amt|trans\s*amt)\b/i.test(c));

      if (dateCol !== -1 && descCol !== -1 && (debitCol !== -1 || creditCol !== -1 || amountCol !== -1)) {
        headerIdx = r;
        colMap.date = dateCol;
        colMap.desc = descCol;
        colMap.debit = debitCol;
        colMap.credit = creditCol;
        colMap.amount = amountCol;
        colMap.type = candidate.findIndex(c => /\b(type|cr\/dr|dr\/cr)\b/i.test(c));
        break;
      }
    }

    // Fallback if no explicit header recognized: Assume col 0: Date, col 1: Desc, col 2: Debit, col 3: Credit
    if (headerIdx === -1) {
      headerIdx = 0;
      colMap = { date: 0, desc: 1, debit: 2, credit: 3, type: -1, amount: -1 };
    }

    const transactions = [];

    for (let r = headerIdx + 1; r < lines.length; r++) {
      const row = lines[r];
      if (!row || row.length <= colMap.date) continue;

      const rawDate = row[colMap.date];
      if (!rawDate || !/\d/.test(rawDate)) continue; // skip non-transaction metadata rows

      const description = (colMap.desc !== -1 && row[colMap.desc]) ? row[colMap.desc] : 'Bank Transaction';
      
      let debit = colMap.debit !== -1 ? this.parseAmount(row[colMap.debit]) : 0;
      let credit = colMap.credit !== -1 ? this.parseAmount(row[colMap.credit]) : 0;
      let type = 'expense';
      let amount = 0;

      if (debit > 0) {
        type = 'expense';
        amount = debit;
      } else if (credit > 0) {
        type = 'income';
        amount = credit;
      } else if (colMap.amount !== -1 && row[colMap.amount]) {
        amount = this.parseAmount(row[colMap.amount]);
        const typeStr = (colMap.type !== -1 && row[colMap.type]) ? row[colMap.type].toLowerCase() : '';
        if (typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('deposit')) {
          type = 'income';
        } else {
          type = 'expense';
        }
      }

      if (amount <= 0) continue; // skip 0-amount or footer rows

      const date = this.parseDate(rawDate);
      const category = this.suggestCategory(description, type);

      transactions.push({
        id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        date,
        description: description.replace(/\s+/g, ' ').trim(),
        amount: parseFloat(amount.toFixed(2)),
        type,
        category,
        selected: true
      });
    }

    transactions.metadata = this.extractAccountMetadata(text);
    return transactions;
  }

  /**
   * Scans text for account metadata such as Account Number, IFSC code, or Bank name
   * @param {string} text
   * @returns {Object|null}
   */
  extractAccountMetadata(text) {
    if (!text || typeof text !== 'string') return null;

    let accountNumber = null;
    let ifscCode = null;
    let detectedBank = null;

    // Detect IFSC code (e.g. SBIN0001234, UTIB0000001, HDFC0000123, ICIC0001234)
    const ifscMatch = text.match(/\b([A-Z]{4}0[A-Z0-9]{6})\b/i);
    if (ifscMatch) {
      ifscCode = ifscMatch[1].toUpperCase();
    }

    // Detect Account Number (e.g. "A/c No: 12345678901", "Account Number: ****1234", "A/C: 987654321")
    const accMatch = text.match(/(?:a\/c|acct|account)(?:\s*no\.?|\s*number)?\s*[:#-]?\s*([xX*0-9]{4,20})/i);
    if (accMatch) {
      accountNumber = accMatch[1].trim();
    }

    // Detect Bank Names
    if (/\b(sbi|state\s*bank\s*of\s*india)\b/i.test(text) || (ifscCode && ifscCode.startsWith('SBIN'))) {
      detectedBank = 'State Bank of India';
    } else if (/\b(axis\s*bank)\b/i.test(text) || (ifscCode && ifscCode.startsWith('UTIB'))) {
      detectedBank = 'Axis Bank';
    } else if (/\b(hdfc\s*bank|hdfc)\b/i.test(text) || (ifscCode && ifscCode.startsWith('HDFC'))) {
      detectedBank = 'HDFC Bank';
    } else if (/\b(icici\s*bank|icici)\b/i.test(text) || (ifscCode && ifscCode.startsWith('ICIC'))) {
      detectedBank = 'ICICI Bank';
    } else if (/\b(kotak\s*mahindra|kotak)\b/i.test(text) || (ifscCode && ifscCode.startsWith('KKBK'))) {
      detectedBank = 'Kotak Mahindra Bank';
    }

    if (accountNumber || ifscCode || detectedBank) {
      return { accountNumber, ifscCode, detectedBank, bankName: detectedBank };
    }
    return null;
  }

  /**
   * Parse text-based PDF statement using bundled PDF.js
   * @param {ArrayBuffer} arrayBuffer
   * @returns {Promise<Array>}
   */
  async parsePDF(arrayBuffer) {
    if (!window.pdfjsLib) {
      throw new Error('PDF.js library is not loaded');
    }

    // Configure local worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = './js/vendor/pdf.worker.min.js';

    const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const extractedRows = [];

    // Date regex matching start of line: e.g. 15/10/2026 or 15-Oct-2026 or 2026-10-15
    const dateStartRegex = /^(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}[\s/-][A-Za-z]{3}[\s/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})/;

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const items = textContent.items;

      if (!items || items.length === 0) continue;

      // Group items by horizontal lines using Y-coordinate
      // In PDF coordinates, Y increases upwards
      const lineMap = new Map();
      const yThreshold = 3.5;

      for (const item of items) {
        if (!item.str || item.str.trim() === '') continue;
        const x = item.transform[4];
        const y = item.transform[5];

        let matchedY = null;
        for (const existingY of lineMap.keys()) {
          if (Math.abs(existingY - y) <= yThreshold) {
            matchedY = existingY;
            break;
          }
        }

        if (matchedY !== null) {
          lineMap.get(matchedY).push({ x, text: item.str });
        } else {
          lineMap.set(y, [{ x, text: item.str }]);
        }
      }

      // Sort lines by Y descending (top of page to bottom)
      const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

      for (const y of sortedYs) {
        const lineItems = lineMap.get(y).sort((a, b) => a.x - b.x);
        const fullLine = lineItems.map(i => i.text).join(' ').trim();

        // Check if line begins with a transaction date
        const dateMatch = fullLine.match(dateStartRegex);
        if (dateMatch) {
          const rawDate = dateMatch[1];
          const remainingText = fullLine.substring(dateMatch[0].length).trim();

          // Extract amounts: search for currency numbers at end of line (Debit, Credit, Balance)
          // Matches numbers like 1,250.00 or 50,000.00 or 450.00
          const amountMatches = remainingText.match(/(\d{1,3}(?:,\d{2,3})*(?:\.\d{2})|\d+(?:\.\d{2}))/g);

          if (amountMatches && amountMatches.length >= 1) {
            // Reconstruct transaction
            let amount = 0;
            let type = 'expense';

            // Determine if debit or credit based on Dr/Cr tag or column position
            const isCredit = /\b(cr|credit|deposit)\b/i.test(fullLine);
            const isDebit = /\b(dr|debit|withdrawal)\b/i.test(fullLine);

            if (isCredit && !isDebit) {
              type = 'income';
              amount = this.parseAmount(amountMatches[0]);
            } else {
              type = 'expense';
              amount = this.parseAmount(amountMatches[0]);
            }

            // Description: everything before the amounts
            let desc = remainingText;
            const firstAmountIdx = remainingText.indexOf(amountMatches[0]);
            if (firstAmountIdx > 0) {
              desc = remainingText.substring(0, firstAmountIdx).trim();
            }

            if (desc.length === 0) desc = 'Bank Transaction';

            if (amount > 0) {
              const date = this.parseDate(rawDate);
              const category = this.suggestCategory(desc, type);

              extractedRows.push({
                id: `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                date,
                description: desc.replace(/\s+/g, ' ').trim(),
                amount: parseFloat(amount.toFixed(2)),
                type,
                category,
                selected: true
              });
            }
          }
        }
      }
    }

    // Attempt to extract account metadata from the first page text items
    let rawPdfSnippet = '';
    try {
      const page1 = await pdf.getPage(1);
      const text1 = await page1.getTextContent();
      rawPdfSnippet = (text1.items || []).map(i => i.str).join(' ');
    } catch (_) {}

    extractedRows.metadata = this.extractAccountMetadata(rawPdfSnippet);
    return extractedRows;
  }

  /**
   * Cross-reference candidate transactions with existing transactions in ledger to flag duplicates
   */
  flagDuplicates(candidateTransactions, existingTransactions = []) {
    if (!existingTransactions || existingTransactions.length === 0) {
      return candidateTransactions.map(t => ({ ...t, isDuplicate: false, selected: true }));
    }

    return candidateTransactions.map(candidate => {
      const isDup = existingTransactions.some(existing => {
        const sameDate = existing.date === candidate.date;
        const sameAmount = Math.abs(parseFloat(existing.amount) - parseFloat(candidate.amount)) < 0.01;
        const normExistingDesc = (existing.description || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const normCandidateDesc = (candidate.description || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        const descMatch = normExistingDesc.includes(normCandidateDesc) || normCandidateDesc.includes(normExistingDesc);

        return sameDate && sameAmount && (descMatch || normExistingDesc === normCandidateDesc);
      });

      return {
        ...candidate,
        isDuplicate: isDup,
        selected: !isDup // Uncheck duplicate by default
      };
    });
  }
}

// Global instance for browser shell
if (typeof window !== 'undefined') {
  window.statementParser = new StatementParser();
}

// Export for Node.js test runner
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StatementParser };
}

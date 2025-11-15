/**
 * PDF Generation Service
 * Generates PDF invoices using jsPDF
 * 
 * Note: Install jsPDF with: npm install jspdf
 */

/**
 * Generate PDF invoice
 * @param {Object} invoiceData - Invoice data
 * @returns {void} Downloads PDF file
 */
export const generateInvoicePDF = (invoiceData) => {
  try {
    // Create a simple HTML-based PDF using browser print
    const {
      invoiceNumber,
      companyName,
      contactPerson,
      email,
      issueDate,
      dueDate,
      paidDate,
      lineItems,
      subtotal,
      tax,
      discount,
      totalAmount,
      notes,
      status
    } = invoiceData;

    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${invoiceNumber}</title>
        <style>
          @media print {
            @page { margin: 0.5in; }
            body { margin: 0; }
            .no-print { display: none; }
          }
          
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          
          .header {
            background: linear-gradient(135deg, #3B82F6 0%, #2563EB 100%);
            color: white;
            padding: 40px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .header h1 {
            margin: 0;
            font-size: 36px;
          }
          
          .header .invoice-number {
            font-size: 18px;
            opacity: 0.9;
            margin-top: 10px;
          }
          
          .company-info {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 30px;
          }
          
          .company-info h3 {
            margin-top: 0;
            color: #1f2937;
          }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          
          .detail-box {
            background-color: #f9fafb;
            padding: 15px;
            border-radius: 8px;
          }
          
          .detail-box label {
            font-weight: bold;
            color: #6b7280;
            font-size: 12px;
            text-transform: uppercase;
          }
          
          .detail-box value {
            display: block;
            font-size: 16px;
            color: #1f2937;
            margin-top: 5px;
          }
          
          .line-items {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          
          .line-items thead {
            background-color: #f3f4f6;
          }
          
          .line-items th {
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid #e5e7eb;
          }
          
          .line-items td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .line-items tr:last-child td {
            border-bottom: none;
          }
          
          .text-right {
            text-align: right;
          }
          
          .totals {
            margin-top: 30px;
            border-top: 2px solid #e5e7eb;
            padding-top: 20px;
          }
          
          .totals-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
          }
          
          .totals-row.total {
            font-size: 24px;
            font-weight: bold;
            color: #3B82F6;
            border-top: 2px solid #3B82F6;
            padding-top: 15px;
            margin-top: 10px;
          }
          
          .notes {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 15px;
            margin-top: 30px;
            border-radius: 4px;
          }
          
          .notes h4 {
            margin-top: 0;
            color: #92400e;
          }
          
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          
          .status-paid {
            background-color: #d1fae5;
            color: #065f46;
          }
          
          .status-sent {
            background-color: #dbeafe;
            color: #1e40af;
          }
          
          .status-draft {
            background-color: #f3f4f6;
            color: #374151;
          }
          
          .status-overdue {
            background-color: #fee2e2;
            color: #991b1b;
          }
          
          .print-button {
            background-color: #3B82F6;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            margin: 20px 0;
          }
          
          .print-button:hover {
            background-color: #2563EB;
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center;">
          <button class="print-button" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="print-button" onclick="window.close()" style="background-color: #6b7280;">Close</button>
        </div>
        
        <div class="header">
          <h1>🚕 TaxiCab</h1>
          <div class="invoice-number">Invoice #${invoiceNumber}</div>
        </div>
        
        <div class="company-info">
          <h3>Bill To:</h3>
          <p><strong>${companyName}</strong></p>
          <p>${contactPerson || ''}</p>
          <p>${email || ''}</p>
        </div>
        
        <div class="invoice-details">
          <div class="detail-box">
            <label>Invoice Number</label>
            <value>${invoiceNumber}</value>
          </div>
          <div class="detail-box">
            <label>Status</label>
            <value>
              <span class="status-badge status-${status}">${status.toUpperCase()}</span>
            </value>
          </div>
          <div class="detail-box">
            <label>Issue Date</label>
            <value>${issueDate}</value>
          </div>
          <div class="detail-box">
            <label>Due Date</label>
            <value>${dueDate}</value>
          </div>
          ${paidDate ? `
            <div class="detail-box">
              <label>Paid Date</label>
              <value>${paidDate}</value>
            </div>
          ` : ''}
        </div>
        
        <table class="line-items">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-right">Quantity</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItems.map(item => `
              <tr>
                <td>${item.description}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${(item.unit_price || item.amount / item.quantity).toFixed(2)}</td>
                <td class="text-right">$${item.amount.toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="totals">
          <div class="totals-row">
            <span>Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          ${tax > 0 ? `
            <div class="totals-row">
              <span>Tax</span>
              <span>$${tax.toFixed(2)}</span>
            </div>
          ` : ''}
          ${discount > 0 ? `
            <div class="totals-row">
              <span>Discount</span>
              <span>-$${discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="totals-row total">
            <span>Total Amount</span>
            <span>$${totalAmount.toFixed(2)}</span>
          </div>
        </div>
        
        ${notes ? `
          <div class="notes">
            <h4>Notes</h4>
            <p>${notes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p><strong>TaxiCab Zimbabwe</strong></p>
          <p>Bulawayo, Zimbabwe</p>
          <p>Email: billing@taxicab.co.zw | Phone: +263 XXX XXXX</p>
          <p style="margin-top: 20px;">Thank you for your business!</p>
          <p style="margin-top: 10px; font-size: 10px;">
            This is a computer-generated invoice. Generated on ${new Date().toLocaleDateString()}
          </p>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Auto-print after a short delay to ensure content is loaded
    setTimeout(() => {
      printWindow.focus();
    }, 250);
    
    return { success: true };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return { success: false, error: error.message };
  }
};

export default {
  generateInvoicePDF
};


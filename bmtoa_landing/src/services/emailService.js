import { supabase } from '../lib/supabase';

/**
 * Email Service
 * Handles sending emails via Supabase Edge Function
 */

/**
 * Send invoice email to corporate client
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} Result object
 */
export const sendInvoiceEmail = async (invoiceData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'invoice_sent',
        data: {
          email: invoiceData.email,
          companyName: invoiceData.companyName,
          invoiceNumber: invoiceData.invoiceNumber,
          issueDate: invoiceData.issueDate,
          dueDate: invoiceData.dueDate,
          totalAmount: invoiceData.totalAmount,
          lineItems: invoiceData.lineItems || []
        }
      }
    });

    if (error) {
      console.error('Error sending invoice email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendInvoiceEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send payment confirmation email
 * @param {Object} paymentData - Payment data
 * @returns {Promise<Object>} Result object
 */
export const sendPaymentConfirmationEmail = async (paymentData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'payment_confirmation',
        data: {
          email: paymentData.email,
          companyName: paymentData.companyName,
          amount: paymentData.amount,
          newBalance: paymentData.newBalance,
          transactionDate: paymentData.transactionDate || new Date().toLocaleDateString()
        }
      }
    });

    if (error) {
      console.error('Error sending payment confirmation email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendPaymentConfirmationEmail:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send low balance alert email
 * @param {Object} alertData - Alert data
 * @returns {Promise<Object>} Result object
 */
export const sendLowBalanceAlert = async (alertData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'low_balance_alert',
        data: {
          email: alertData.email,
          companyName: alertData.companyName,
          currentBalance: alertData.currentBalance,
          threshold: alertData.threshold
        }
      }
    });

    if (error) {
      console.error('Error sending low balance alert:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendLowBalanceAlert:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Send invoice paid confirmation email
 * @param {Object} invoiceData - Invoice data
 * @returns {Promise<Object>} Result object
 */
export const sendInvoicePaidEmail = async (invoiceData) => {
  try {
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: {
        emailType: 'invoice_paid',
        data: {
          email: invoiceData.email,
          companyName: invoiceData.companyName,
          invoiceNumber: invoiceData.invoiceNumber,
          amount: invoiceData.amount,
          paidDate: invoiceData.paidDate || new Date().toLocaleDateString()
        }
      }
    });

    if (error) {
      console.error('Error sending invoice paid email:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Error in sendInvoicePaidEmail:', error);
    return { success: false, error: error.message };
  }
};

export default {
  sendInvoiceEmail,
  sendPaymentConfirmationEmail,
  sendLowBalanceAlert,
  sendInvoicePaidEmail
};


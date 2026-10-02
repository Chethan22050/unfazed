const PDFDocument = require("pdfkit");

const createInvoice = ({ payment, client, therapist }) => {
  const document = new PDFDocument({ size: "A4", margin: 56 });
  const currency = payment.currency || process.env.CURRENCY || "INR";
  const rupees = (paise) => `${currency} ${(paise / 100).toFixed(2)}`;
  document.fontSize(11).fillColor("#52645a").text("UNFAZED", { characterSpacing: 1.4 });
  document.moveDown(2).fontSize(28).fillColor("#20352f").text("Payment invoice");
  document.moveDown(0.4).fontSize(11).fillColor("#68746d").text(`Invoice ${payment.invoiceNumber}`);
  document.text(`Issued ${new Intl.DateTimeFormat("en-IN", { dateStyle: "long" }).format(payment.paidAt || payment.createdAt)}`);
  document.moveDown(2).fillColor("#20352f").fontSize(12).text("From", { continued: false });
  document.fontSize(11).fillColor("#52645a").text(therapist.name);
  document.moveDown().fillColor("#20352f").fontSize(12).text("Billed to");
  document.fontSize(11).fillColor("#52645a").text(client.name).text(client.email);
  document.moveDown(2).fillColor("#20352f").fontSize(12).text("Description", 56, document.y, { continued: true });
  document.text("Amount", { align: "right" });
  document.moveTo(56, document.y + 8).lineTo(539, document.y + 8).strokeColor("#d9ded5").stroke();
  document.moveDown().fontSize(11).fillColor("#52645a").text("Therapy service or session package", 56, document.y, { continued: true });
  document.text(rupees(payment.amountPaise), { align: "right" });
  document.moveDown().text(`Platform fee: ${rupees(payment.platformFeePaise)}`, { align: "right" });
  document.fontSize(12).fillColor("#20352f").text(`Net to therapist: ${rupees(payment.netAmountPaise)}`, { align: "right" });
  document.moveDown(3).fontSize(9).fillColor("#78837b").text("This invoice is generated electronically by Unfazed.");
  document.end();
  return document;
};

module.exports = { createInvoice };
'use strict';

// Shared invoice defaults transcribed from the existing approved invoice template.
// Keep recipient details, amounts and VAT treatment in the validated invoice snapshot.
module.exports = Object.freeze({
  version: 3,
  pageSize: 'A4',
  logoPath: 'marketizo-logo.png',
  fontFamily: 'Arial',
  colors: Object.freeze({ accent: '#F7931E', tableHeader: '#F7CAAC', text: '#000000', footer: '#595959', background: '#FFFFFF' }),
  issuer: Object.freeze({
    legalName: 'Marketizo Digital e.U.', proprietor: 'Miljan Marinjes',
    street: 'Simmeringer Hauptstraße 24', postalCode: '1110', city: 'Wien', country: 'AT',
    phone: '+43 681 811 44 747', email: 'office@marketizo.com', website: 'www.marketizo.com',
    companyNumber: '561722m', vatId: 'ATU77282726',
    bank: 'Bank Austria', iban: 'AT081200010034820943', bic: 'BKAUATWW'
  }),
  defaults: Object.freeze({
    description: 'Führung von Social-Media-Kanälen', quantity: 1, paymentTermDays: 7,
    heading: 'RECHNUNG Nr.', introduction: 'Nachfolgend finden Sie die Detailaufstellung zur Rechnung.',
    paymentTerms: 'Bitte überweisen Sie den ausstehenden Betrag innerhalb von 7 Tagen ab Rechnungsdatum.',
    questions: 'Bei Rückfragen stehen wir selbstverständlich jederzeit gerne zur Verfügung.',
    closing: 'Mit freundlichen Grüßen'
  }),
  columns: Object.freeze(['Beschreibung', 'Menge', 'Einzelpreis', 'USt.', 'Nettopreis'])
});

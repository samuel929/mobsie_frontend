export type ConsentFormTemplate = {
  id: string;
  title: string;
  description: string;
  clauses: string[];
};

export type ConsentFormCompletion = {
  applicationReference: string;
  childName: string;
  guardianName: string;
  guardianId: string;
  signature: string;
  signedAt: string;
};

export const consentFormTemplates: ConsentFormTemplate[] = [
  {
    id: 'excursion-consent',
    title: 'Excursion Consent',
    description: 'Permission for supervised school outings and educational excursions.',
    clauses: [
      'I authorise my child to attend the described excursion.',
      'I confirm that the school has current emergency and medical information.',
      'I understand that reasonable safety measures and supervision will be provided.',
    ],
  },
  {
    id: 'photography-consent',
    title: 'Photography & Media Consent',
    description: 'Choose how photographs or videos of your child may be used.',
    clauses: [
      'Internal classroom and parent communication',
      'School website and newsletter',
      'Public social media and promotional material',
    ],
  },
  {
    id: 'medical-consent',
    title: 'Medical Information & Treatment Consent',
    description: 'Emergency treatment permission and confirmation of medical information.',
    clauses: [
      'I confirm that the medical information supplied to the school is accurate.',
      'I authorise first aid and reasonable emergency treatment when I cannot be reached.',
      'I will notify the school when medical information changes.',
    ],
  },
  {
    id: 'transport-consent',
    title: 'Transport Consent',
    description: 'Permission and collection instructions for approved school transport.',
    clauses: [
      'Only approved transport and collection arrangements may be used.',
      'The school must be notified of any change in writing.',
      'The parent or guardian remains responsible for accurate contact details.',
    ],
  },
  {
    id: 'general-consent',
    title: 'General Consent & School Policies',
    description: 'Acknowledgement of school rules, safeguarding and data policies.',
    clauses: [
      'I have reviewed the school rules and safeguarding procedures.',
      'I consent to necessary processing of information for education and administration.',
      'I understand that consent choices may be updated by contacting the school.',
    ],
  },
];

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

export function consentFormHtml(form: ConsentFormTemplate, completion?: ConsentFormCompletion) {
  const clauses = form.clauses.map((clause) => `<li>${clause}</li>`).join('');
  const value = (key: keyof ConsentFormCompletion) =>
    completion ? escapeHtml(completion[key]) : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width"><style>body{font-family:Arial,sans-serif;color:#173f3b;padding:34px;line-height:1.55}h1{font-size:25px}.brand{color:#ff640d;font-weight:700;margin-bottom:30px}.box{border:1px solid #d9e1df;border-radius:12px;padding:20px}li{margin:12px 0}.line{border-bottom:1px solid #536b67;min-height:35px;margin-top:18px;font-size:16px;padding:8px 4px 0}.label{font-size:12px;color:#65736f}.signature{font-family:cursive;font-size:24px;color:#173f3b}.notice{background:#e8f6ee;border-radius:10px;padding:12px;margin-top:24px;font-size:12px}</style></head><body><div class="brand">Mobsie Connect</div><h1>${form.title}</h1><p>${form.description}</p><div class="box"><strong>Parent / guardian declaration</strong><ul>${clauses}</ul></div><div class="line">${value('applicationReference')}</div><div class="label">Child application reference</div><div class="line">${value('childName')}</div><div class="label">Child's full name</div><div class="line">${value('guardianName')}</div><div class="label">Parent / guardian full name</div><div class="line">${value('guardianId')}</div><div class="label">Parent / guardian ID or passport number</div><div class="line signature">${value('signature')}</div><div class="label">Electronic signature</div><div class="line">${value('signedAt')}</div><div class="label">Date signed</div>${completion ? '<div class="notice">Electronically completed and accepted through Mobsie Connect.</div>' : ''}</body></html>`;
}
